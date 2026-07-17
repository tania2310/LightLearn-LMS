from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
import random


class User(AbstractUser):
    is_approved = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, blank=True)
    otp_created = models.DateTimeField(null=True, blank=True)

    STUDENT = "student"
    MENTOR = "mentor"
    ADMIN = "admin"

    ROLE_CHOICES = [
        (STUDENT, "Student"),
        (MENTOR, "Mentor"),
        (ADMIN, "Admin"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=STUDENT,
    )

    phone_number = models.CharField(max_length=15, blank=True)
    profile_picture = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True
    )

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        # Students are approved automatically
        if self.role == "student":
            self.is_approved = True

        super().save(*args, **kwargs)