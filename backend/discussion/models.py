from django.db import models
from accounts.models import User
from courses.models import Course


class ChatRoom(models.Model):
    course = models.OneToOneField(
        Course,
        on_delete=models.CASCADE,
        related_name="chat_room"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)
    locked_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="locked_rooms"
    )

    def __str__(self):
        return f"{self.course.title} Chat"


class ChatMessage(models.Model):
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="chat_messages"
    )

    message = models.TextField()

    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.username}: {self.message[:30]}"