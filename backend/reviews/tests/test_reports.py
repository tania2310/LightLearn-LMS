from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from courses.models import Course, Enrollment, Review, ReviewReport

User = get_user_model()

class ReviewReportTests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin_user",
            email="admin@example.com",
            password="password123",
            role="admin"
        )
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
        self.reporter = User.objects.create_user(
            username="reporter_user",
            email="reporter@example.com",
            password="password123",
            role="student",
            is_approved=True
        )
        self.course = Course.objects.create(
            mentor=self.mentor,
            title="Premium English",
            description="Grammar rules.",
            category="Languages",
            level="intermediate",
            language="English",
            duration=6,
            price=50.00,
            status="approved"
        )
        Enrollment.objects.create(student=self.student, course=self.course, status="approved")
        self.review = Review.objects.create(student=self.student, course=self.course, rating=5, comment="Love it!")
        self.report_url = reverse("review-report", args=[self.review.id])

    def test_student_can_report_review_only_once(self):
        self.client.force_authenticate(user=self.reporter)
        payload = {"reason": "Spam", "description": "Too spammy"}

        # First report succeeds
        response = self.client.post(self.report_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ReviewReport.objects.count(), 1)

        # Second report fails (duplicate)
        response = self.client.post(self.report_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_hide_and_restore_reviews(self):
        self.client.force_authenticate(user=self.admin)
        hide_url = reverse("review-hide", args=[self.review.id])
        restore_url = reverse("review-restore", args=[self.review.id])

        # Hide
        response = self.client.post(hide_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.review.refresh_from_db()
        self.assertTrue(self.review.is_hidden)
        self.assertEqual(self.review.hidden_by, self.admin)

        # Restore
        response = self.client.post(restore_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.review.refresh_from_db()
        self.assertFalse(self.review.is_hidden)

    def test_admin_can_dismiss_and_mark_report_reviewed(self):
        report = ReviewReport.objects.create(
            review=self.review,
            reported_by=self.reporter,
            reason="Offensive",
            description="Bad words"
        )
        dismiss_url = reverse("reviewreport-dismiss", args=[report.id])
        reviewed_url = reverse("reviewreport-reviewed", args=[report.id])

        self.client.force_authenticate(user=self.admin)
        
        # Mark reviewed
        response = self.client.post(reviewed_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        report.refresh_from_db()
        self.assertEqual(report.status, "Reviewed")

        # Dismiss
        response = self.client.post(dismiss_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        report.refresh_from_db()
        self.assertEqual(report.status, "Dismissed")
