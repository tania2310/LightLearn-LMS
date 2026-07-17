from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

class AuthenticationTests(APITestCase):

    def setUp(self):
        self.register_url = reverse("register")
        self.login_url = reverse("login")
        self.profile_url = reverse("profile")

        self.student_data = {
            "username": "student_test",
            "email": "student@example.com",
            "password": "testpassword123",
            "role": "student",
            "phone_number": "1234567890"
        }

        self.mentor_data = {
            "username": "mentor_test",
            "email": "mentor@example.com",
            "password": "testpassword123",
            "role": "mentor",
            "phone_number": "0987654321"
        }

    def test_student_registration_succeeds(self):
        response = self.client.post(self.register_url, self.student_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        
        user = User.objects.get(username="student_test")
        self.assertEqual(user.role, User.STUDENT)
        self.assertTrue(user.is_approved)  # Students approved automatically

    def test_mentor_registration_awaits_approval(self):
        response = self.client.post(self.register_url, self.mentor_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        user = User.objects.get(username="mentor_test")
        self.assertEqual(user.role, User.MENTOR)
        self.assertFalse(user.is_approved)  # Mentors need admin approval

    def test_login_and_jwt_issuance(self):
        # Create student user
        user = User.objects.create_user(
            username="student_login",
            email="login@example.com",
            password="testpassword123",
            role="student",
            is_email_verified=True,
            is_approved=True
        )

        credentials = {
            "username": "student_login",
            "password": "testpassword123"
        }

        response = self.client.post(self.login_url, credentials, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        # Authenticate profile request using access token
        access_token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        profile_response = self.client.get(self.profile_url)
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["username"], "student_login")
