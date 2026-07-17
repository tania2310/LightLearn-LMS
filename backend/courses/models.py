from django.db import models
from accounts.models import User
from django.utils import timezone
from django.db.models import Avg
import uuid


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
    
    @property
    def average_rating(self):
        active_reviews = self.reviews.filter(is_hidden=False)
        v = active_reviews.count()
        if v == 0:
            return 0
        avg = active_reviews.aggregate(avg=Avg("rating"))["avg"]
        R = avg if avg else 0
        
        m = 2 # Minimum review threshold
        
        # Calculate platform-wide average rating for all courses, excluding hidden reviews
        all_reviews = Review.objects.filter(is_hidden=False)
        platform_avg = all_reviews.aggregate(avg=Avg("rating"))["avg"]
        C = platform_avg if platform_avg else 0
        
        if v >= m:
            weighted = (v / (v + m)) * R + (m / (v + m)) * C
            return round(weighted, 1)
        
        return round(R, 1)


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
        ("text", "Text"),
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

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student.username} - {self.course.title}"

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

class Quiz(models.Model):
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="quizzes"
    )

    title = models.CharField(max_length=200)

    def __str__(self):
        return self.title


class Question(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions"
    )

    question = models.TextField()

    option1 = models.CharField(max_length=255)
    option2 = models.CharField(max_length=255)
    option3 = models.CharField(max_length=255)
    option4 = models.CharField(max_length=255)

    correct_option = models.PositiveSmallIntegerField()

    def __str__(self):
        return self.question

class Review(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    rating = models.PositiveSmallIntegerField()

    comment = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    approved = models.BooleanField(default=True)
    is_hidden = models.BooleanField(default=False)
    hidden_at = models.DateTimeField(null=True, blank=True)
    hidden_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="hidden_reviews"
    )

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student.email} - {self.course.title}"

class ReviewReport(models.Model):
    REASON_CHOICES = [
        ("Spam", "Spam"),
        ("Offensive", "Offensive"),
        ("Harassment", "Harassment"),
        ("Fake Review", "Fake Review"),
        ("Other", "Other"),
    ]

    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Reviewed", "Reviewed"),
        ("Dismissed", "Dismissed"),
    ]

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="reports"
    )
    reported_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="review_reports"
    )
    reason = models.CharField(
        max_length=50,
        choices=REASON_CHOICES
    )
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("reported_by", "review")

    def __str__(self):
        return f"Report on {self.review} by {self.reported_by.username}"

class Certificate(models.Model):
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="certificates",
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="certificates",
    )

    certificate_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    issued_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        unique_together = ("student", "course")

    def __str__(self):
        return f"{self.student.username} - {self.course.title}"