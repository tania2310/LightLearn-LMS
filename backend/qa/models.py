from django.db import models
from accounts.models import User
from courses.models import Course


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
