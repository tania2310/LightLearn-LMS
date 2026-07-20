from django.db import models
from accounts.models import User
from courses.models import Course, Lesson


class Question(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="questions",
    )

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )

    question = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question[:50]


class Answer(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="answers",
    )

    mentor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )

    answer = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.answer[:50]


class AIConversation(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="ai_conversations",
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="ai_conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "lesson"],
                name="unique_student_lesson_ai_chat",
            )
        ]

    def __str__(self):
        return f"AI Chat - {self.student.username} - {self.lesson.title}"


class AIMessage(models.Model):
    SENDER_CHOICES = (
        ("user", "User"),
        ("assistant", "Assistant"),
    )

    conversation = models.ForeignKey(
        AIConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.CharField(
        max_length=20,
        choices=SENDER_CHOICES,
    )
    message = models.TextField()
    model_used = models.CharField(
        max_length=50,
        blank=True,
        default="",
    )
    tokens_used = models.IntegerField(
        default=0,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender}: {self.message[:30]}"
