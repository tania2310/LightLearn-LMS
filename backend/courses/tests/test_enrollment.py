from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from courses.models import Course, Enrollment, Review

User = get_user_model()

class CourseEnrollmentTests(APITestCase):

    def setUp(self):
        self.mentor = User.objects.create_user(
            username="mentor_user",
            email="mentor@example.com",
            password="password123",
            role="mentor",
            is_approved=True
        )
        self.student = User.objects.create_user(
            username="student_user",
            email="student@example.com",
            password="password123",
            role="student",
            is_approved=True
        )
        self.free_course = Course.objects.create(
            mentor=self.mentor,
            title="Free Python Course",
            description="Basics.",
            category="Programming",
            level="beginner",
            language="English",
            duration=5,
            price=0.00,
            status="approved"
        )
        self.paid_course = Course.objects.create(
            mentor=self.mentor,
            title="Paid Advanced Course",
            description="Deep dive.",
            category="Programming",
            level="advanced",
            language="English",
            duration=15,
            price=150.00,
            status="approved"
        )
        self.enrollment_url = reverse("enrollment-list")

    def test_free_course_enrollment_starts_pending(self):
        self.client.force_authenticate(user=self.student)
        payload = {"course": self.free_course.id}
        
        response = self.client.post(self.enrollment_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Enrollment.objects.count(), 1)
        
        enrollment = Enrollment.objects.first()
        self.assertEqual(enrollment.status, "pending")

    def test_paid_course_enrollment_starts_pending(self):
        self.client.force_authenticate(user=self.student)
        payload = {"course": self.paid_course.id}
        
        response = self.client.post(self.enrollment_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        enrollment = Enrollment.objects.get(course=self.paid_course)
        self.assertEqual(enrollment.status, "pending")

    def test_review_posting_succeeds_and_updates_rating(self):
        # Student enrolls in free course
        enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.free_course,
            status="approved"
        )

        review_url = reverse("review-list")
        self.client.force_authenticate(user=self.student)
        review_payload = {
            "course": self.free_course.id,
            "rating": 5,
            "comment": "Incredible course!"
        }

        response = self.client.post(review_url, review_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.count(), 1)
