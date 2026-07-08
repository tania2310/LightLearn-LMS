from django.db import models
from accounts.models import User
from django.utils import timezone


class Course(models.Model):

    LEVEL_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending", "Pending Approval"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    mentor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="courses",
    )

    title = models.CharField(max_length=200)
    description = models.TextField()

    thumbnail = models.ImageField(
        upload_to="course_thumbnails/",
        blank=True,
        null=True,
    )

    category = models.CharField(max_length=100)

    level = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
    )

    language = models.CharField(max_length=50)

    duration = models.PositiveIntegerField(
        help_text="Duration in hours"
    )

    price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class Module(models.Model):

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="modules",
    )

    title = models.CharField(max_length=200)

    order = models.PositiveIntegerField()

    def __str__(self):
        return self.title


class Lesson(models.Model):

    LESSON_TYPES = [
        ("video", "Video"),
        ("pdf", "PDF"),
        ("document", "Document"),
    ]

    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="lessons",
    )

    title = models.CharField(max_length=200)

    lesson_type = models.CharField(
        max_length=20,
        choices=LESSON_TYPES,
    )

    content = models.FileField(
        upload_to="lesson_content/"
    )

    order = models.PositiveIntegerField()

    def __str__(self):
        return self.title

class Enrollment(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="enrollments"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="enrollments"
    )

    enrolled_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student.username} -> {self.course.title}"

class Progress(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="progress",
    )

    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="progress",
    )

    completed = models.BooleanField(default=False)

    completed_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        unique_together = ("student", "lesson")

    def __str__(self):
        return f"{self.student.username} - {self.lesson.title}"