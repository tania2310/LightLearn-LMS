from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from courses.models import Course, Module, Lesson, Enrollment
from qa.models import AIConversation, AIMessage


class AIChatTests(APITestCase):
    def setUp(self):
        # Create users
        self.mentor = User.objects.create_user(
            username="mentor",
            email="mentor@example.com",
            password="password123",
            role="mentor",
        )
        self.student = User.objects.create_user(
            username="student",
            email="student@example.com",
            password="password123",
            role="student",
        )
        
        # Create course structure
        self.course = Course.objects.create(
            mentor=self.mentor,
            title="Python Basics",
            description="Basics",
            category="Programming",
            level="beginner",
            language="English",
            duration=10,
            price=0.00,
            status="approved",
        )
        self.module = Module.objects.create(
            course=self.course,
            title="Variables",
            order=1,
        )
        self.lesson = Lesson.objects.create(
            module=self.module,
            title="Declaring Variables",
            lesson_type="text",
            order=1,
        )
        
        # Approved Enrollment
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course,
            status="approved",
        )

        self.list_url = reverse("ai-conversation-list")
        self.create_url = reverse("ai-conversation-list")

    def test_get_conversation_unauthenticated_fails(self):
        response = self.client.get(f"{self.list_url}?lesson={self.lesson.id}")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_conversation_success(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f"{self.list_url}?lesson={self.lesson.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["lesson"], self.lesson.id)
        self.assertEqual(len(response.data["messages"]), 0)

    def test_post_question_success(self):
        self.client.force_authenticate(user=self.student)
        payload = {
            "lesson": self.lesson.id,
            "question": "What is a variable?",
        }
        response = self.client.post(self.create_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("answer", response.data)
        self.assertEqual(len(response.data["messages"]), 2) # User message + Assistant reply

    def test_clear_conversation_success(self):
        self.client.force_authenticate(user=self.student)
        conversation = AIConversation.objects.create(
            student=self.student,
            lesson=self.lesson
        )
        AIMessage.objects.create(
            conversation=conversation,
            sender="user",
            message="Hi"
        )
        clear_url = reverse("ai-conversation-clear", args=[conversation.id])
        response = self.client.delete(clear_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(conversation.messages.count(), 0)

    def test_unapproved_student_blocked(self):
        # Create unapproved student
        student2 = User.objects.create_user(
            username="student2",
            email="student2@example.com",
            password="password123",
            role="student",
        )
        self.client.force_authenticate(user=student2)
        response = self.client.get(f"{self.list_url}?lesson={self.lesson.id}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

