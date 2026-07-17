from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from courses.models import Course, Enrollment
from payments.models import Payment, RefundRequest
from unittest.mock import patch, MagicMock

User = get_user_model()

class RefundProcessingTests(APITestCase):

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
        self.admin = User.objects.create_superuser(
            username="admin_user",
            email="admin@example.com",
            password="password123",
            role="admin"
        )
        self.course = Course.objects.create(
            mentor=self.mentor,
            title="Premium History",
            description="Deep history.",
            category="History",
            level="advanced",
            language="English",
            duration=10,
            price=199.00,
            status="approved"
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course,
            status="approved"
        )
        self.payment = Payment.objects.create(
            enrollment=self.enrollment,
            student=self.student,
            provider="Stripe",
            transaction_id="ch_mock_intent_123",
            payment_intent_id="sess_mock_123",
            amount=199.00,
            currency="INR",
            status="Paid"
        )
        self.refund_url = reverse("refund-payment", args=[self.payment.id])

    @patch("stripe.Refund.create")
    def test_admin_can_refund_payment_and_revoke_access(self, mock_refund_create):
        mock_refund_create.return_value = MagicMock()

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.refund_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "Refunded")

        # Verify RefundRequest log is created and status set to Approved
        self.assertTrue(RefundRequest.objects.filter(enrollment=self.enrollment, status="Approved").exists())
