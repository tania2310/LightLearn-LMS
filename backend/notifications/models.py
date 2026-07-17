from django.db import models
from accounts.models import User

class Notification(models.Model):
    TYPE_CHOICES = [
        ("Enrollment", "Enrollment"),
        ("Lesson", "Lesson"),
        ("QA", "QA"),
        ("Refund", "Refund"),
        ("Announcement", "Announcement"),
        ("System", "System"),
    ]

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES
    )
    target_url = models.CharField(max_length=255, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.notification_type} to {self.recipient.username}: {self.title}"
