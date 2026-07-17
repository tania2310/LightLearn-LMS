from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class PasswordResetOTPTests(APITestCase):

    def setUp(self):
        self.forgot_password_url = reverse("forgot-password")
        self.verify_otp_url = reverse("verify-reset-otp")
        self.reset_password_url = reverse("reset-password")

        self.user = User.objects.create_user(
            username="reset_user",
            email="reset@example.com",
            password="oldpassword123",
            role="student",
            is_email_verified=True,
            is_approved=True
        )

    def test_forgot_password_generates_otp(self):
        response = self.client.post(self.forgot_password_url, {"email": "reset@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.user.refresh_from_db()
        self.assertTrue(len(self.user.otp) == 6)
        self.assertIsNotNone(self.user.otp_created)

    def test_otp_verification_success(self):
        # Set a mock valid OTP
        self.user.otp = "654321"
        self.user.otp_created = timezone.now()
        self.user.save()

        verify_payload = {
            "email": "reset@example.com",
            "otp": "654321"
        }
        response = self.client.post(self.verify_otp_url, verify_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "OTP Verified")

    def test_otp_expired_fails(self):
        # Set an expired OTP (created 15 minutes ago)
        self.user.otp = "123456"
        self.user.otp_created = timezone.now() - timedelta(minutes=15)
        self.user.save()

        verify_payload = {
            "email": "reset@example.com",
            "otp": "123456"
        }
        response = self.client.post(self.verify_otp_url, verify_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", response.data["error"].lower())

    def test_reset_password_changes_auth_credentials(self):
        # Trigger reset
        reset_payload = {
            "email": "reset@example.com",
            "password": "newpassword123"
        }
        response = self.client.post(self.reset_password_url, reset_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Confirm credentials changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpassword123"))
