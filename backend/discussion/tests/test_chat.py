from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from courses.models import Course
from discussion.models import ChatRoom

User = get_user_model()

class ChatModerationTests(APITestCase):

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
        self.chatroom = ChatRoom.objects.create(
            course=self.course
        )
        self.lock_url = reverse("lock-room", args=[self.chatroom.id])
        self.unlock_url = reverse("unlock-room", args=[self.chatroom.id])

    def test_mentor_can_lock_and_unlock_chatroom(self):
        self.client.force_authenticate(user=self.mentor)
        
        # Test Lock
        response = self.client.post(self.lock_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.chatroom.refresh_from_db()
        self.assertTrue(self.chatroom.is_locked)

        # Test Unlock
        response = self.client.post(self.unlock_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.chatroom.refresh_from_db()
        self.assertFalse(self.chatroom.is_locked)

    def test_student_cannot_lock_chatroom(self):
        self.client.force_authenticate(user=self.student)
        
        response = self.client.post(self.lock_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        self.chatroom.refresh_from_db()
        self.assertFalse(self.chatroom.is_locked)
