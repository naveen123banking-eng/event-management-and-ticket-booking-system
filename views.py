import io
import csv
import uuid
from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

import qrcode
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from .models import (
    User, Category, Event, TicketType, Booking, Ticket,
    Payment, PromoCode, Notification, AuditLog
)
from .serializers import (
    UserSerializer, RegisterSerializer, CategorySerializer,
    EventListSerializer, EventDetailSerializer, TicketTypeSerializer,
    BookingSerializer, TicketSerializer, PaymentSerializer,
    PromoCodeSerializer, NotificationSerializer
)

# Helper function to generate JWT token for user
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': UserSerializer(user).data
    }

# ----------------- AUTH VIEWS -----------------

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            # Welcome notification
            Notification.objects.create(
                user=user,
                title="Welcome to EventSphere!",
                message=f"Hi {user.name or user.username}, explore upcoming concerts, conferences, and sports events.",
                notification_type="system"
            )
            return Response(tokens, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Check account lockout
        if user.locked_until and user.locked_until > timezone.now():
            return Response({'detail': 'Account temporarily locked due to too many failed attempts. Try again later.'}, status=status.HTTP_403_FORBIDDEN)

        if user.check_password(password):
            user.failed_login_attempts = 0
            user.locked_until = None
            user.save()
            tokens = get_tokens_for_user(user)
            return Response(tokens)
        else:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = timezone.now() + timedelta(minutes=15)
                user.save()
                return Response({'detail': 'Too many failed login attempts. Account locked for 15 minutes.'}, status=status.HTTP_403_FORBIDDEN)
            user.save()
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)


class DemoLoginView(APIView):
    """
    Convenient switcher to test as Attendee (Naveen KS), Organizer, Gate Staff, or Admin.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        role = request.data.get('role', 'attendee')
        user = User.objects.filter(role=role).first()
        if not user:
            # Fallback to first user
            user = User.objects.first()
            if not user:
                return Response({'detail': 'No user found. Please run seed command.'}, status=status.HTTP_404_NOT_FOUND)
        
        tokens = get_tokens_for_user(user)
        return Response(tokens)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ----------------- EVENT VIEWS -----------------

class CategoryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.all()
        return Response(CategorySerializer(categories, many=True).data)


class EventListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        events = Event.objects.filter(status='published')

        # Filters
        category_slug = request.query_params.get('category')
        if category_slug and category_slug != 'all':
            events = events.filter(category__slug=category_slug)

        city = request.query_params.get('city')
        if city:
            events = events.filter(city__iexact=city)

        search = request.query_params.get('search')
        if search:
            events = events.filter(
                Q(title__icontains=search) |
                Q(venue__icontains=search) |
                Q(city__icontains=search) |
                Q(description__icontains=search)
            )

        min_price = request.query_params.get('min_price')
        if min_price:
            events = events.filter(starting_price__gte=Decimal(min_price))

        max_price = request.query_params.get('max_price')
        if max_price:
            events = events.filter(starting_price__lte=Decimal(max_price))

        date_filter = request.query_params.get('date')
        now = timezone.now()
        if date_filter == 'today':
            events = events.filter(start_datetime__date=now.date())
        elif date_filter == 'weekend':
            events = events.filter(start_datetime__gte=now)
        elif date_filter == 'upcoming':
            events = events.filter(start_datetime__gte=now)

        # Sorting
        sort = request.query_params.get('sort', 'date_asc')
        if sort == 'date_asc':
            events = events.order_by('start_datetime')
        elif sort == 'date_desc':
            events = events.order_by('-start_datetime')
        elif sort == 'price_asc':
            events = events.order_by('starting_price')
        elif sort == 'price_desc':
            events = events.order_by('-starting_price')
        elif sort == 'popular':
            events = events.order_by('-featured', 'start_datetime')

        serializer = EventListSerializer(events, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Organizer creating an event
        if not request.user.is_authenticated or request.user.role not in ['organizer', 'admin']:
            return Response({'detail': 'Only organizers or admins can create events.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        try:
            category = Category.objects.get(id=data.get('category_id'))
        except (Category.DoesNotExist, ValueError):
            category = Category.objects.first()

        event = Event.objects.create(
            title=data.get('title'),
            description=data.get('description', ''),
            category=category,
            venue=data.get('venue', ''),
            city=data.get('city', 'Coimbatore'),
            address=data.get('address', ''),
            start_datetime=data.get('start_datetime'),
            end_datetime=data.get('end_datetime'),
            banner_url=data.get('banner_url', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80'),
            capacity=data.get('capacity', 500),
            starting_price=data.get('starting_price', 199.00),
            organizer=request.user,
            status='published' if request.user.role == 'admin' else 'pending',
            featured=data.get('featured', False)
        )

        # Add ticket tiers if provided
        ticket_types = data.get('ticket_types', [])
        if not ticket_types:
            # Default tier
            TicketType.objects.create(
                event=event,
                name='General Admission',
                price=Decimal(str(event.starting_price)),
                total_quantity=event.capacity,
                available_quantity=event.capacity,
                description='Standard entrance pass'
            )
        else:
            for tt in ticket_types:
                TicketType.objects.create(
                    event=event,
                    name=tt.get('name', 'General Admission'),
                    price=Decimal(str(tt.get('price', 199))),
                    total_quantity=int(tt.get('quantity', 100)),
                    available_quantity=int(tt.get('quantity', 100)),
                    description=tt.get('description', '')
                )

        # Create notification for admins
        for admin in User.objects.filter(role='admin'):
            Notification.objects.create(
                user=admin,
                title="New Event Pending Approval",
                message=f"Event '{event.title}' by {request.user.name} requires your review.",
                notification_type="approval"
            )

        return Response(EventDetailSerializer(event).data, status=status.HTTP_201_CREATED)


class EventDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        event = get_object_or_404(Event, pk=pk)
        return Response(EventDetailSerializer(event).data)

    def put(self, request, pk):
        event = get_object_or_404(Event, pk=pk)
        if not request.user.is_authenticated or (request.user != event.organizer and request.user.role != 'admin'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        event.title = data.get('title', event.title)
        event.description = data.get('description', event.description)
        event.venue = data.get('venue', event.venue)
        event.city = data.get('city', event.city)
        if 'start_datetime' in data:
            event.start_datetime = data['start_datetime']
        if 'end_datetime' in data:
            event.end_datetime = data['end_datetime']
        if 'banner_url' in data:
            event.banner_url = data['banner_url']
        if 'starting_price' in data:
            event.starting_price = Decimal(str(data['starting_price']))
        event.save()
        return Response(EventDetailSerializer(event).data)

    def delete(self, request, pk):
        event = get_object_or_404(Event, pk=pk)
        if not request.user.is_authenticated or (request.user != event.organizer and request.user.role != 'admin'):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Instead of deleting, mark cancelled if bookings exist
        if event.bookings.filter(status='confirmed').exists():
            event.status = 'cancelled'
            event.save()
            return Response({'detail': 'Event cancelled and attendees will be refunded.'})
        else:
            event.delete()
            return Response({'detail': 'Event deleted successfully.'})


class EventApprovalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'detail': 'Only administrators can approve or reject events.'}, status=status.HTTP_403_FORBIDDEN)

        event = get_object_or_404(Event, pk=pk)
        action = request.data.get('action') # 'approve' or 'reject'
        reason = request.data.get('reason', '')

        if action == 'approve':
            event.status = 'published'
            event.rejection_reason = ''
            event.save()
            Notification.objects.create(
                user=event.organizer,
                title="Event Approved!",
                message=f"Your event '{event.title}' is now live on EventSphere.",
                notification_type="event"
            )
            return Response({'detail': 'Event approved and published.', 'status': event.status})
        elif action == 'reject':
            event.status = 'rejected'
            event.rejection_reason = reason
            event.save()
            Notification.objects.create(
                user=event.organizer,
                title="Event Submission Rejected",
                message=f"Your event '{event.title}' was rejected. Reason: {reason}",
                notification_type="event"
            )
            return Response({'detail': 'Event rejected.', 'status': event.status})
        return Response({'detail': 'Invalid action. Specify approve or reject.'}, status=status.HTTP_400_BAD_REQUEST)


# ----------------- BOOKING & CHECKOUT VIEWS -----------------

class CreateBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        event_id = request.data.get('event_id')
        items = request.data.get('items', []) # [{'ticket_type_id': 1, 'quantity': 2, 'names': ['...']}]
        promo_code_str = request.data.get('promo_code', '').strip().upper()

        if not items:
            return Response({'detail': 'No tickets selected.'}, status=status.HTTP_400_BAD_REQUEST)

        total_qty = sum(item.get('quantity', 0) for item in items)
        if total_qty < 1 or total_qty > 10:
            return Response({'detail': 'You can book between 1 and 10 tickets per transaction.'}, status=status.HTTP_400_BAD_REQUEST)

        event = get_object_or_404(Event, pk=event_id)
        if event.status != 'published':
            return Response({'detail': 'Event is not open for bookings.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            subtotal = Decimal('0.00')
            ticket_allocations = []

            for item in items:
                tt_id = item.get('ticket_type_id')
                qty = item.get('quantity', 0)
                if qty <= 0:
                    continue

                # Lock ticket type row for concurrency safety (FR-BKG-04)
                ticket_type = TicketType.objects.select_for_update().get(id=tt_id, event=event)
                if ticket_type.available_quantity < qty:
                    return Response({
                        'detail': f'Only {ticket_type.available_quantity} tickets available for {ticket_type.name}.'
                    }, status=status.HTTP_409_CONFLICT)

                # Reserve inventory temporarily
                ticket_type.available_quantity -= qty
                ticket_type.save()

                item_total = ticket_type.price * qty
                subtotal += item_total
                ticket_allocations.append({
                    'ticket_type': ticket_type,
                    'quantity': qty,
                    'names': item.get('names', [user.name or user.username] * qty)
                })

            # Check Promo Code
            discount = Decimal('0.00')
            if promo_code_str:
                try:
                    promo = PromoCode.objects.get(code=promo_code_str)
                    is_valid, msg = promo.is_valid(subtotal)
                    if is_valid:
                        discount = (subtotal * Decimal(promo.discount_percent)) / Decimal(100)
                        if discount > promo.max_discount_amount:
                            discount = promo.max_discount_amount
                except PromoCode.DoesNotExist:
                    pass

            # Taxes (GST 18%) & Convenience Fee (₹40 per ticket)
            convenience_fee = Decimal('40.00') * Decimal(total_qty)
            taxable_amount = max(Decimal('0.00'), (subtotal - discount) + convenience_fee)
            taxes = (taxable_amount * Decimal('0.18')).quantize(Decimal('0.01'))
            total_amount = taxable_amount + taxes

            # Reference No
            ref_no = f"ESH-{timezone.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

            # 10 minute hold timer (FR-BKG-03)
            hold_expires_at = timezone.now() + timedelta(minutes=10)

            booking = Booking.objects.create(
                reference_no=ref_no,
                user=user,
                event=event,
                subtotal=subtotal,
                discount=discount,
                taxes=taxes,
                convenience_fee=convenience_fee,
                total_amount=total_amount,
                promo_code=promo_code_str,
                status='held',
                hold_expires_at=hold_expires_at
            )

            # Pre-create tickets in valid hold state
            for alloc in ticket_allocations:
                tt = alloc['ticket_type']
                names = alloc['names']
                for i in range(alloc['quantity']):
                    attendee_name = names[i] if i < len(names) else user.name or "Guest"
                    qr_payload = f"TKT-{ref_no}-{tt.id}-{uuid.uuid4().hex[:8].upper()}"
                    Ticket.objects.create(
                        booking=booking,
                        ticket_type=tt,
                        qr_code=qr_payload,
                        attendee_name=attendee_name,
                        status='valid',
                        seat_identifier=f"SEC-{tt.name[:2].upper()}-{uuid.uuid4().hex[:3].upper()}"
                    )

            # Mock payment record
            Payment.objects.create(
                booking=booking,
                gateway_order_id=f"order_{uuid.uuid4().hex[:14]}",
                amount=total_amount,
                status='pending'
            )

        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class BookingListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(user=request.user).order_by('-created_at')
        return Response(BookingSerializer(bookings, many=True).data)


class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk)
        if booking.user != request.user and request.user.role not in ['admin', 'gate_staff', 'organizer']:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(BookingSerializer(booking).data)


class CancelBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk, user=request.user)
        if booking.status != 'confirmed':
            return Response({'detail': 'Only confirmed bookings can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            booking.status = 'cancelled'
            booking.save()

            # Mark tickets cancelled and return inventory
            for ticket in booking.tickets.all():
                ticket.status = 'cancelled'
                ticket.save()
                tt = ticket.ticket_type
                tt.available_quantity += 1
                tt.save()

            # Process refund
            if hasattr(booking, 'payment'):
                p = booking.payment
                p.status = 'refunded'
                p.refund_id = f"rfnd_{uuid.uuid4().hex[:12]}"
                p.refund_amount = booking.total_amount
                p.save()

            Notification.objects.create(
                user=booking.user,
                title="Booking Cancelled & Refund Processed",
                message=f"Your booking {booking.reference_no} for {booking.event.title} has been cancelled. ₹{booking.total_amount} refunded to original payment method.",
                notification_type="refund"
            )

        return Response({
            'detail': 'Booking cancelled successfully. Refund initiated.',
            'booking': BookingSerializer(booking).data
        })


# ----------------- PAYMENT VIEWS -----------------

class ConfirmPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        method = request.data.get('method', 'upi') # 'upi', 'card', 'netbanking'
        
        booking = get_object_or_404(Booking, pk=booking_id, user=request.user)

        if booking.status == 'confirmed':
            return Response(BookingSerializer(booking).data)

        if booking.status == 'cancelled':
            return Response({'detail': 'Booking has been cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if hold expired
        if booking.is_hold_expired():
            # Release inventory
            with transaction.atomic():
                for t in booking.tickets.all():
                    tt = t.ticket_type
                    tt.available_quantity += 1
                    tt.save()
                booking.status = 'expired'
                booking.save()
            return Response({'detail': 'Ticket reservation time expired. Please reselect your tickets.'}, status=status.HTTP_400_BAD_REQUEST)

        # Complete payment
        with transaction.atomic():
            booking.status = 'confirmed'
            booking.save()

            payment = booking.payment
            payment.status = 'success'
            payment.method = method
            payment.gateway_payment_id = f"pay_{uuid.uuid4().hex[:14]}"
            payment.paid_at = timezone.now()
            payment.save()

            # Notification
            Notification.objects.create(
                user=booking.user,
                title="Booking Confirmed! 🎟️",
                message=f"You're going to '{booking.event.title}'! Your tickets and QR codes are ready.",
                notification_type="ticket"
            )

        return Response(BookingSerializer(booking).data)


# ----------------- PROMO CODE VIEW -----------------

class ValidatePromoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code_str = request.data.get('code', '').strip().upper()
        order_amount = Decimal(str(request.data.get('amount', 0)))

        try:
            promo = PromoCode.objects.get(code=code_str)
            valid, msg = promo.is_valid(order_amount)
            if not valid:
                return Response({'valid': False, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)
            
            calc_discount = (order_amount * Decimal(promo.discount_percent)) / Decimal(100)
            if calc_discount > promo.max_discount_amount:
                calc_discount = promo.max_discount_amount

            return Response({
                'valid': True,
                'code': promo.code,
                'discount_percent': promo.discount_percent,
                'discount_amount': float(calc_discount),
                'message': f"Promo code applied! {promo.discount_percent}% off up to ₹{promo.max_discount_amount}."
            })
        except PromoCode.DoesNotExist:
            return Response({'valid': False, 'message': 'Invalid promo code.'}, status=status.HTTP_404_NOT_FOUND)


# ----------------- TICKET VALIDATION SCANNER (GATE STAFF) -----------------

class TicketValidateView(APIView):
    permission_classes = [AllowAny] # Allow scanner testing seamlessly

    def post(self, request):
        qr_code = request.data.get('qr_code', '').strip()
        event_id = request.data.get('event_id')

        if not qr_code:
            return Response({'result': 'INVALID', 'message': 'No QR code provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ticket = Ticket.objects.select_related('booking__event', 'ticket_type', 'booking__user').get(qr_code=qr_code)
        except Ticket.DoesNotExist:
            return Response({
                'result': 'INVALID',
                'message': 'Ticket QR code not found in system database.',
                'qr_code': qr_code
            }, status=status.HTTP_404_NOT_FOUND)

        event = ticket.booking.event

        # Check event match if gate staff selected a specific event
        if event_id and str(event.id) != str(event_id):
            return Response({
                'result': 'INVALID',
                'message': f"Ticket is for '{event.title}', not this event!",
                'event_title': event.title
            }, status=status.HTTP_400_BAD_REQUEST)

        if ticket.status == 'used':
            return Response({
                'result': 'ALREADY_USED',
                'message': f"Ticket already used on {ticket.checked_in_at.strftime('%d %b %Y at %I:%M %p') if ticket.checked_in_at else 'earlier'}.",
                'attendee_name': ticket.attendee_name,
                'ticket_type': ticket.ticket_type.name,
                'event_title': event.title,
                'checked_in_at': ticket.checked_in_at
            })

        if ticket.status == 'cancelled':
            return Response({
                'result': 'INVALID',
                'message': 'This ticket was cancelled or refunded.',
                'attendee_name': ticket.attendee_name,
                'event_title': event.title
            })

        # Mark Valid & Used
        ticket.status = 'used'
        ticket.checked_in_at = timezone.now()
        if request.user.is_authenticated:
            ticket.checked_in_by = request.user
        ticket.save()

        return Response({
            'result': 'VALID',
            'message': 'Access Granted! Ticket verified successfully.',
            'attendee_name': ticket.attendee_name,
            'ticket_type': ticket.ticket_type.name,
            'event_title': event.title,
            'seat': ticket.seat_identifier,
            'checked_in_at': ticket.checked_in_at
        })


# ----------------- PDF TICKET DOWNLOAD -----------------

class DownloadTicketPDFView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        booking = get_object_or_404(Booking, pk=pk)

        # Generate PDF in-memory using ReportLab
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Background header
        p.setFillColor(colors.HexColor("#6C5DD3"))
        p.rect(0, height - 120, width, 120, fill=1, stroke=0)

        # Header Text
        p.setFillColor(colors.white)
        p.setFont("Helvetica-Bold", 26)
        p.drawString(40, height - 60, "EventSphere")
        p.setFont("Helvetica", 12)
        p.drawString(40, height - 85, "Official E-Ticket & Entry Pass")

        # Booking Ref
        p.setFont("Helvetica-Bold", 14)
        p.drawRightString(width - 40, height - 60, f"Booking: {booking.reference_no}")
        p.setFont("Helvetica", 10)
        p.drawRightString(width - 40, height - 80, f"Status: {booking.status.upper()}")

        # Event Details
        y = height - 160
        p.setFillColor(colors.HexColor("#1F2937"))
        p.setFont("Helvetica-Bold", 20)
        p.drawString(40, y, booking.event.title)

        y -= 30
        p.setFont("Helvetica", 12)
        p.drawString(40, y, f"Venue: {booking.event.venue}, {booking.event.city}")
        y -= 22
        p.drawString(40, y, f"Date & Time: {booking.event.start_datetime.strftime('%A, %d %B %Y at %I:%M %p')}")

        y -= 40
        # Draw line
        p.setStrokeColor(colors.HexColor("#E5E7EB"))
        p.line(40, y, width - 40, y)

        # Tickets & QR codes
        y -= 30
        p.setFont("Helvetica-Bold", 14)
        p.drawString(40, y, "Attendee Tickets:")

        y -= 20
        for ticket in booking.tickets.all():
            if y < 150:
                p.showPage()
                y = height - 60

            # Generate QR Code image in-memory
            qr = qrcode.QRCode(box_size=3, border=1)
            qr.add_data(ticket.qr_code)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='PNG')
            img_buffer.seek(0)

            # Ticket box
            p.setFillColor(colors.HexColor("#F8F9FD"))
            p.roundRect(40, y - 90, width - 80, 85, 8, fill=1, stroke=0)

            # Text inside
            p.setFillColor(colors.HexColor("#111827"))
            p.setFont("Helvetica-Bold", 13)
            p.drawString(55, y - 25, f"Attendee: {ticket.attendee_name}")
            p.setFont("Helvetica", 11)
            p.drawString(55, y - 45, f"Category: {ticket.ticket_type.name}  |  Seat: {ticket.seat_identifier or 'General'}")
            p.setFont("Helvetica-Oblique", 9)
            p.setFillColor(colors.HexColor("#6B7280"))
            p.drawString(55, y - 65, f"QR Code ID: {ticket.qr_code}")

            # Draw QR image
            from reportlab.lib.utils import ImageReader
            qr_reader = ImageReader(img_buffer)
            p.drawImage(qr_reader, width - 125, y - 85, width=75, height=75)

            y -= 105

        # Terms & footer
        p.setFont("Helvetica", 9)
        p.setFillColor(colors.HexColor("#9CA3AF"))
        p.drawString(40, 40, "Terms: Present this digital ticket or printed copy at the entrance gate. Valid ID card required.")
        p.drawRightString(width - 40, 40, "Generated by EventSphere System")

        p.showPage()
        p.save()

        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="EventSphere-Tickets-{booking.reference_no}.pdf"'
        return response


# ----------------- ORGANIZER REPORTS & ATTENDEES -----------------

class OrganizerStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        events = Event.objects.filter(organizer=user)
        total_events = events.count()
        
        confirmed_bookings = Booking.objects.filter(event__in=events, status='confirmed')
        total_revenue = confirmed_bookings.aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0.00')
        total_tickets_sold = Ticket.objects.filter(booking__in=confirmed_bookings).count()
        total_attendees_checked_in = Ticket.objects.filter(booking__in=confirmed_bookings, status='used').count()

        # Recent sales
        recent_bookings = confirmed_bookings.select_related('user', 'event')[:10]

        return Response({
            'total_events': total_events,
            'total_revenue': float(total_revenue),
            'total_tickets_sold': total_tickets_sold,
            'checked_in_count': total_attendees_checked_in,
            'events': EventListSerializer(events, many=True).data,
            'recent_sales': BookingSerializer(recent_bookings, many=True).data
        })


class OrganizerAttendeesExportCSV(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, event_id):
        event = get_object_or_404(Event, pk=event_id)
        if request.user != event.organizer and request.user.role != 'admin':
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="attendees-{event.id}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Ticket ID', 'Attendee Name', 'Ticket Category', 'Seat', 'Status', 'Booking Ref', 'Booked By', 'Checked In At'])

        tickets = Ticket.objects.filter(booking__event=event).select_related('booking__user', 'ticket_type')
        for t in tickets:
            writer.writerow([
                t.qr_code,
                t.attendee_name,
                t.ticket_type.name,
                t.seat_identifier,
                t.status,
                t.booking.reference_no,
                t.booking.user.email,
                t.checked_in_at.strftime('%Y-%m-%d %H:%M:%S') if t.checked_in_at else 'No'
            ])

        return response


# ----------------- ADMIN DASHBOARD STATS -----------------

class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'detail': 'Only administrators can view admin statistics.'}, status=status.HTTP_403_FORBIDDEN)

        total_users = User.objects.count()
        total_events = Event.objects.count()
        pending_events = Event.objects.filter(status='pending').count()
        all_confirmed_bookings = Booking.objects.filter(status='confirmed')
        gross_revenue = all_confirmed_bookings.aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0.00')
        platform_commission = (gross_revenue * Decimal('0.05')).quantize(Decimal('0.01')) # 5% commission

        pending_list = Event.objects.filter(status='pending').select_related('organizer', 'category')
        all_users = User.objects.all().order_by('-created_at')[:20]

        return Response({
            'total_users': total_users,
            'total_events': total_events,
            'pending_approvals': pending_events,
            'gross_revenue': float(gross_revenue),
            'platform_commission': float(platform_commission),
            'pending_events': EventListSerializer(pending_list, many=True).data,
            'users': UserSerializer(all_users, many=True).data
        })


class AdminUserToggleStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'admin':
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(User, pk=pk)
        user.is_active = not user.is_active
        user.save()
        return Response({'id': user.id, 'is_active': user.is_active})


# ----------------- NOTIFICATIONS -----------------

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user)[:20]
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({
            'unread_count': unread_count,
            'notifications': NotificationSerializer(notifications, many=True).data
        })

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'Marked all notifications as read.'})
