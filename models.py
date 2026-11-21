import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    ROLE_CHOICES = (
        ('attendee', 'Attendee'),
        ('organizer', 'Organizer'),
        ('gate_staff', 'Gate Staff'),
        ('admin', 'Administrator'),
    )
    
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='attendee')
    is_verified = models.BooleanField(default=True)
    avatar_url = models.URLField(blank=True, default='')
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.name or self.username} ({self.role})"


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, default='music')
    bg_color = models.CharField(max_length=50, default='bg-purple-100 text-purple-600')

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Event(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('published', 'Published'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='events')
    venue = models.CharField(max_length=255)
    city = models.CharField(max_length=100, default='Coimbatore')
    address = models.CharField(max_length=255, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    banner_url = models.URLField(max_length=500, blank=True)
    capacity = models.PositiveIntegerField(default=1000)
    starting_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    organizer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organized_events')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True)
    featured = models.BooleanField(default=False)
    terms_and_conditions = models.TextField(blank=True, default="Entry strictly with valid QR ticket. Outside food & beverages not allowed. Management reserves right of admission.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_datetime']

    def __str__(self):
        return self.title

    @property
    def total_available_tickets(self):
        return sum(tt.available_quantity for tt in self.ticket_types.all())

    @property
    def is_sold_out(self):
        return self.total_available_tickets <= 0


class TicketType(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_types')
    name = models.CharField(max_length=100) # e.g. Early Bird, Regular, VIP
    price = models.DecimalField(max_digits=10, decimal_places=2)
    total_quantity = models.PositiveIntegerField()
    available_quantity = models.PositiveIntegerField()
    description = models.CharField(max_length=255, blank=True)
    sale_start = models.DateTimeField(null=True, blank=True)
    sale_end = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.event.title} - {self.name} (₹{self.price})"


class PromoCode(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.PositiveIntegerField(default=10)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    max_uses = models.PositiveIntegerField(default=100)
    used_count = models.PositiveIntegerField(default=0)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def is_valid(self, order_amount=0):
        now = timezone.now()
        if not self.is_active:
            return False, "Promo code is inactive"
        if self.valid_to and now > self.valid_to:
            return False, "Promo code has expired"
        if self.used_count >= self.max_uses:
            return False, "Promo code usage limit reached"
        if order_amount < self.min_order_amount:
            return False, f"Minimum order amount ₹{self.min_order_amount} required"
        return True, "Valid"

    def __str__(self):
        return f"{self.code} ({self.discount_percent}% off)"


class Booking(models.Model):
    STATUS_CHOICES = (
        ('held', 'Held (Awaiting Payment)'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Hold Expired'),
    )

    reference_no = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bookings')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    taxes = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    convenience_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    promo_code = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='held')
    hold_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def is_hold_expired(self):
        return self.status == 'held' and timezone.now() > self.hold_expires_at

    def __str__(self):
        return f"{self.reference_no} - {self.user.email} - {self.status}"


class Ticket(models.Model):
    STATUS_CHOICES = (
        ('valid', 'Valid'),
        ('used', 'Used'),
        ('cancelled', 'Cancelled'),
    )

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='tickets')
    ticket_type = models.ForeignKey(TicketType, on_delete=models.CASCADE, related_name='tickets')
    qr_code = models.CharField(max_length=100, unique=True)
    attendee_name = models.CharField(max_length=150)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='valid')
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='scanned_tickets')
    seat_identifier = models.CharField(max_length=50, blank=True, default='')

    def __str__(self):
        return f"Ticket {self.qr_code} ({self.status})"


class Payment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    gateway_order_id = models.CharField(max_length=100, blank=True)
    gateway_payment_id = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    method = models.CharField(max_length=50, default='upi')
    paid_at = models.DateTimeField(null=True, blank=True)
    refund_id = models.CharField(max_length=100, blank=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Payment {self.gateway_payment_id or self.gateway_order_id} - {self.status}"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    notification_type = models.CharField(max_length=50, default='general')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.title}"


class AuditLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    target = models.CharField(max_length=200)
    details = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp}] {self.actor} - {self.action} on {self.target}"
