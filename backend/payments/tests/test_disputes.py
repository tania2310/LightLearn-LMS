from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from courses.models import Course, Enrollment
from payments.models import Payment, RefundRequest
from django.utils import timezone
import json

User = get_user_model()

class PaymentDisputeTests(APITestCase):

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
            title="Premium English",
            description="Grammar rules.",
            category="Languages",
            level="intermediate",
            language="English",
            duration=6,
            price=50.00,
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
            transaction_id="ch_disputed_tx_123",
            payment_intent_id="sess_disputed_123",
            amount=50.00,
            currency="INR",
            status="Paid"
        )
        self.stripe_webhook_url = reverse("stripe-webhook")
        self.paypal_webhook_url = reverse("paypal-webhook")

    def test_stripe_dispute_created_webhook_revokes_access(self):
        payload = {
            "type": "charge.dispute.created",
            "data": {
                "object": {
                    "id": "dp_stripe_123",
                    "charge": "ch_disputed_tx_123",
                    "payment_intent": "sess_disputed_123"
                }
            }
        }
        
        response = self.client.post(self.stripe_webhook_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "Disputed")
        self.assertEqual(self.payment.dispute_reference, "dp_stripe_123")
        self.assertIsNotNone(self.payment.disputed_at)

        # Verify entitlement is revoked
        self.assertTrue(RefundRequest.objects.filter(enrollment=self.enrollment, status="Approved").exists())

    def test_stripe_dispute_resolved_won_restores_access(self):
        # Set payment status to Disputed and create a RefundRequest
        self.payment.status = "Disputed"
        self.payment.save()
        refund_req = RefundRequest.objects.create(
            student=self.student,
            enrollment=self.enrollment,
            status="Approved",
            reason="Dispute revokes access"
        )

        payload = {
            "type": "charge.dispute.closed",
            "data": {
                "object": {
                    "id": "dp_stripe_123",
                    "charge": "ch_disputed_tx_123",
                    "payment_intent": "sess_disputed_123",
                    "status": "won"
                }
            }
        }
        
        response = self.client.post(self.stripe_webhook_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "Paid")

        refund_req.refresh_from_db()
        self.assertEqual(refund_req.status, "Rejected")
