from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Category, Event, TicketType, Booking, Ticket, Payment, PromoCode, Notification

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'phone', 'role', 'avatar_url', 'is_verified', 'created_at']
        read_only_fields = ['id', 'is_verified', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'name', 'phone', 'role']

    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data.get('email')
        username = email.split('@')[0]
        
        # ensure unique username
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            **validated_data
        )
        return user


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'bg_color']


class TicketTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketType
        fields = ['id', 'event', 'name', 'price', 'total_quantity', 'available_quantity', 'description', 'sale_start', 'sale_end']
        read_only_fields = ['id']


class EventListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    available_tickets = serializers.IntegerField(source='total_available_tickets', read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'category', 'category_name', 'category_slug',
            'venue', 'city', 'start_datetime', 'end_datetime', 'banner_url',
            'starting_price', 'organizer', 'organizer_name', 'status',
            'featured', 'available_tickets', 'is_sold_out', 'created_at'
        ]


class EventDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), source='category', write_only=True, required=False)
    ticket_types = TicketTypeSerializer(many=True, read_only=True)
    organizer = UserSerializer(read_only=True)
    available_tickets = serializers.IntegerField(source='total_available_tickets', read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'category', 'category_id',
            'venue', 'city', 'address', 'latitude', 'longitude',
            'start_datetime', 'end_datetime', 'banner_url', 'capacity',
            'starting_price', 'organizer', 'status', 'rejection_reason',
            'featured', 'terms_and_conditions', 'ticket_types',
            'available_tickets', 'is_sold_out', 'created_at', 'updated_at'
        ]


class TicketSerializer(serializers.ModelSerializer):
    ticket_type_name = serializers.CharField(source='ticket_type.name', read_only=True)
    price = serializers.DecimalField(source='ticket_type.price', max_digits=10, decimal_places=2, read_only=True)
    event_title = serializers.CharField(source='booking.event.title', read_only=True)
    event_venue = serializers.CharField(source='booking.event.venue', read_only=True)
    event_city = serializers.CharField(source='booking.event.city', read_only=True)
    event_datetime = serializers.DateTimeField(source='booking.event.start_datetime', read_only=True)
    event_banner = serializers.CharField(source='booking.event.banner_url', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'booking', 'ticket_type', 'ticket_type_name', 'price',
            'qr_code', 'attendee_name', 'status', 'checked_in_at', 'seat_identifier',
            'event_title', 'event_venue', 'event_city', 'event_datetime', 'event_banner'
        ]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'gateway_order_id', 'gateway_payment_id',
            'amount', 'status', 'method', 'paid_at', 'refund_id', 'refund_amount'
        ]


class BookingSerializer(serializers.ModelSerializer):
    tickets = TicketSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_venue = serializers.CharField(source='event.venue', read_only=True)
    event_city = serializers.CharField(source='event.city', read_only=True)
    event_start = serializers.DateTimeField(source='event.start_datetime', read_only=True)
    event_banner = serializers.CharField(source='event.banner_url', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'reference_no', 'user', 'event', 'event_title', 'event_venue',
            'event_city', 'event_start', 'event_banner', 'subtotal', 'discount',
            'taxes', 'convenience_fee', 'total_amount', 'promo_code', 'status',
            'hold_expires_at', 'created_at', 'tickets', 'payment'
        ]
        read_only_fields = ['reference_no', 'user', 'status', 'created_at']


class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = ['id', 'code', 'discount_percent', 'max_discount_amount', 'min_order_amount', 'is_active']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'title', 'message', 'is_read', 'notification_type', 'created_at']
