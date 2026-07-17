from django.db import models
from accounts.models import User
from courses.models import Enrollment

class RefundRequest(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Approved", "Approved"),
        ("Rejected", "Rejected"),
    ]

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="refund_requests",
    )
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="refund_requests",
    )
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Pending",
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("student", "enrollment")

    def __str__(self):
        return f"Refund request by {self.student.username} for {self.enrollment.course.title}"

class Payment(models.Model):
    PROVIDER_CHOICES = [
        ("Stripe", "Stripe"),
        ("PayPal", "PayPal"),
    ]

    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Paid", "Paid"),
        ("Failed", "Failed"),
        ("Refunded", "Refunded"),
        ("Disputed", "Disputed"),
    ]

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
    )
    payment_intent_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )
    transaction_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    currency = models.CharField(
        max_length=10,
        default="INR",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    disputed_at = models.DateTimeField(null=True, blank=True)
    dispute_reference = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.provider} Payment - {self.student.username} - {self.amount} {self.currency}"
