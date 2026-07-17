from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from courses.models import Course, Enrollment
from payments.models import Payment
from unittest.mock import patch, MagicMock

User = get_user_model()

class PaymentProcessingTests(APITestCase):

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
        self.course = Course.objects.create(
            mentor=self.mentor,
            title="Premium Chemistry",
            description="High level.",
            category="Science",
            level="advanced",
            language="English",
            duration=20,
            price=299.00,
            status="approved"
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course,
            status="pending"
        )
        self.stripe_checkout_url = reverse("stripe-checkout")
        self.paypal_create_order_url = reverse("paypal-create-order")

    @patch("stripe.checkout.Session.create")
    def test_stripe_checkout_session_creation(self, mock_session_create):
        # Mock stripe Session object returning session id and url
        mock_session = MagicMock()
        mock_session.id = "sess_mock_123"
        mock_session.url = "https://checkout.stripe.com/pay/mock"
        mock_session_create.return_value = mock_session

        self.client.force_authenticate(user=self.student)
        payload = {"enrollment_id": self.enrollment.id}
        
        response = self.client.post(self.stripe_checkout_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], "sess_mock_123")
        self.assertEqual(response.data["url"], "https://checkout.stripe.com/pay/mock")
        
        # Verify Payment record created in Pending state
        self.assertTrue(Payment.objects.filter(payment_intent_id="sess_mock_123", status="Pending").exists())

    @patch("requests.post")
    def test_paypal_order_creation_mock(self, mock_post):
        # Ensure we test with client_id configured as sandbox so it targets sandboxed API rather than mock fallback
        with patch.dict("os.environ", {"PAYPAL_CLIENT_ID": "real_sandbox_client_id", "PAYPAL_SECRET": "real_sandbox_secret"}):
            # Mock oauth token response
            mock_auth_res = MagicMock()
            mock_auth_res.json.return_value = {"access_token": "mock_access_token"}
            
            # Mock order create response
            mock_order_res = MagicMock()
            mock_order_res.json.return_value = {
                "id": "PAY-SANDBOX-ORDER-1",
                "links": [{"rel": "approve", "href": "https://paypal.com/approve/mock"}]
            }
            
            mock_post.side_effect = [mock_auth_res, mock_order_res]

            self.client.force_authenticate(user=self.student)
            payload = {"enrollment_id": self.enrollment.id}
            
            response = self.client.post(self.paypal_create_order_url, payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["id"], "PAY-SANDBOX-ORDER-1")
            self.assertEqual(response.data["approval_url"], "https://paypal.com/approve/mock")
