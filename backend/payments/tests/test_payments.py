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
            status="approved"
        )
        self.paypal_create_order_url = reverse("paypal-create-order")

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

    def test_paypal_capture_order_success(self):
        payment = Payment.objects.create(
            enrollment=self.enrollment,
            student=self.student,
            provider="PayPal",
            transaction_id="PAY-SANDBOX-ORDER-1",
            amount=299.00,
            currency="INR",
            status="Pending"
        )
        self.client.force_authenticate(user=self.student)
        url = reverse("paypal-capture-order")
        payload = {"order_id": "PAY-SANDBOX-ORDER-1"}
        
        with patch.dict("os.environ", {"PAYPAL_CLIENT_ID": "AZMLB3eLDYGV7pv3I1KP_1aRt1eQRYOcu5uQNm1B5OQzuElgsD9LcYBrLFNDHMwvw2_0aYE4ddVPHXGQ"}):
            response = self.client.post(url, payload, format="json")
            
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["status"], "Paid")
        self.assertEqual(response.data["transaction_id"], "PAY-SANDBOX-ORDER-1")
        self.assertEqual(response.data["payment_id"], payment.id)

        payment.refresh_from_db()
        self.assertEqual(payment.status, "Paid")
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.status, "approved")

    @patch("requests.post")
    def test_paypal_capture_order_sandbox_success(self, mock_post):
        payment = Payment.objects.create(
            enrollment=self.enrollment,
            student=self.student,
            provider="PayPal",
            transaction_id="PAY-SANDBOX-ORDER-SAND",
            amount=299.00,
            currency="INR",
            status="Pending"
        )
        self.client.force_authenticate(user=self.student)
        url = reverse("paypal-capture-order")
        payload = {"order_id": "PAY-SANDBOX-ORDER-SAND"}

        # Mock oauth token response
        mock_auth_res = MagicMock()
        mock_auth_res.json.return_value = {"access_token": "mock_access_token"}
        
        # Mock capture response
        mock_capture_res = MagicMock()
        mock_capture_res.json.return_value = {"status": "COMPLETED"}
        
        mock_post.side_effect = [mock_auth_res, mock_capture_res]

        with patch.dict("os.environ", {"PAYPAL_CLIENT_ID": "real_sandbox_client_id", "PAYPAL_SECRET": "real_sandbox_secret"}):
            response = self.client.post(url, payload, format="json")
            
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["status"], "Paid")
        self.assertEqual(response.data["transaction_id"], "PAY-SANDBOX-ORDER-SAND")

        payment.refresh_from_db()
        self.assertEqual(payment.status, "Paid")
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.status, "approved")

    def test_paypal_capture_order_idempotent(self):
        payment = Payment.objects.create(
            enrollment=self.enrollment,
            student=self.student,
            provider="PayPal",
            transaction_id="PAY-SANDBOX-ORDER-2",
            amount=299.00,
            currency="INR",
            status="Paid"
        )
        self.client.force_authenticate(user=self.student)
        url = reverse("paypal-capture-order")
        payload = {"order_id": "PAY-SANDBOX-ORDER-2"}
        
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["status"], "Paid")
        self.assertEqual(response.data["message"], "PayPal order captured successfully.")

    def test_download_receipt_pdf_success(self):
        payment = Payment.objects.create(
            enrollment=self.enrollment,
            student=self.student,
            provider="PayPal",
            transaction_id="PAY-SANDBOX-ORDER-3",
            amount=299.00,
            currency="INR",
            status="Paid"
        )
        self.client.force_authenticate(user=self.student)
        url = reverse("payment-receipt", args=[payment.id])
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(len(b"".join(response.streaming_content)) > 0)

    def test_download_receipt_pdf_forbidden(self):
        payment = Payment.objects.create(
            enrollment=self.enrollment,
            student=self.student,
            provider="PayPal",
            transaction_id="PAY-SANDBOX-ORDER-4",
            amount=299.00,
            currency="INR",
            status="Paid"
        )
        other_user = User.objects.create_user(
            username="other_student",
            email="other@example.com",
            password="password123",
            role="student"
        )
        self.client.force_authenticate(user=other_user)
        url = reverse("payment-receipt", args=[payment.id])
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

