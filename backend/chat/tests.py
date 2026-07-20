import json
from django.test import TransactionTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from channels.testing import WebsocketCommunicator
from config.asgi import application
from accounts.models import User
from courses.models import Course, Enrollment

TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
class CourseChatTests(TransactionTestCase):
    def setUp(self):
        # Create users
        self.mentor = User.objects.create_user(
            username="mentor_user",
            email="mentor@test.com",
            password="password123",
            role="mentor"
        )
        self.student = User.objects.create_user(
            username="student_user",
            email="student@test.com",
            password="password123",
            role="student"
        )
        
        # Create course
        self.course = Course.objects.create(
            mentor=self.mentor,
            title="Variables",
            description="Variables",
            category="Programming",
            level="beginner",
            language="English",
            duration=10,
            price=0.00,
            status="approved"
        )
        
        # Enrollment
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course,
            status="approved"
        )

    async def test_anonymous_user_rejected(self):
        communicator = WebsocketCommunicator(application, f"ws/chat/{self.course.id}/")
        connected, subprotocol = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_authenticated_enrolled_student_accepts_and_broadcasts(self):
        communicator = WebsocketCommunicator(application, f"ws/chat/{self.course.id}/")
        communicator.scope["user"] = self.student
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)

        # Consume initial presence_update broadcast
        presence_msg = await communicator.receive_json_from()
        self.assertEqual(presence_msg.get("type"), "presence_update")

        # Test ping-pong
        await communicator.send_to(text_data="ping")
        response = await communicator.receive_from()
        response_data = json.loads(response)
        self.assertEqual(response_data.get("type"), "pong")

        # Test broadcast message
        payload = {
            "message": "Hello class",
            "client_id": "tmp-12345"
        }
        await communicator.send_json_to(payload)

        # Receive broadcast
        broadcast_res = await communicator.receive_json_from()
        self.assertEqual(broadcast_res["message"], "Hello class")
        self.assertEqual(broadcast_res["username"], "student_user")
        self.assertEqual(broadcast_res["role"], "student")
        self.assertEqual(broadcast_res["user_id"], self.student.id)
        self.assertEqual(broadcast_res["client_id"], "tmp-12345")
        self.assertIn("timestamp", broadcast_res)
        self.assertIn("id", broadcast_res)

        await communicator.disconnect()

    async def test_non_enrolled_student_rejected(self):
        from channels.db import database_sync_to_async
        other_student = await database_sync_to_async(User.objects.create_user)(
            username="other_student",
            email="other@test.com",
            password="password123",
            role="student"
        )
        communicator = WebsocketCommunicator(application, f"ws/chat/{self.course.id}/")
        communicator.scope["user"] = other_student
        
        connected, subprotocol = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_invalid_json_payload(self):
        communicator = WebsocketCommunicator(application, f"ws/chat/{self.course.id}/")
        communicator.scope["user"] = self.student
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)

        # Consume initial presence_update broadcast
        presence_msg = await communicator.receive_json_from()
        self.assertEqual(presence_msg.get("type"), "presence_update")

        await communicator.send_to(text_data="invalid-json")
        response = await communicator.receive_json_from()
        self.assertEqual(response.get("error"), "Invalid message")

        await communicator.disconnect()

    async def test_reply_to_reply_is_rejected(self):
        communicator = WebsocketCommunicator(application, f"ws/chat/{self.course.id}/")
        communicator.scope["user"] = self.student
        
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        await communicator.receive_json_from()

        # Create top-level message
        await communicator.send_json_to({"message": "Question 1", "client_id": "tmp-1"})
        top_msg = await communicator.receive_json_from()
        top_msg_id = top_msg["id"]

        # Create reply to top-level message
        await communicator.send_json_to({"message": "Reply 1", "parent_id": top_msg_id, "client_id": "tmp-2"})
        reply_msg = await communicator.receive_json_from()
        reply_msg_id = reply_msg["id"]
        self.assertEqual(reply_msg["parent_id"], top_msg_id)

        # Attempt to reply to a reply -> Must be rejected
        await communicator.send_json_to({"message": "Nested reply attempt", "parent_id": reply_msg_id, "client_id": "tmp-3"})
        err_res = await communicator.receive_json_from()
        self.assertIn("error", err_res)
        self.assertEqual(err_res["error"], "Replies can only be added to top-level messages.")

        await communicator.disconnect()


class CourseChatRestTests(APITestCase):
    def setUp(self):
        self.mentor = User.objects.create_user(
            username="mentor_user",
            email="mentor@test.com",
            password="password123",
            role="mentor"
        )
        self.student = User.objects.create_user(
            username="student_user",
            email="student@test.com",
            password="password123",
            role="student"
        )
        self.course = Course.objects.create(
            mentor=self.mentor,
            title="Variables",
            description="Variables",
            category="Programming",
            level="beginner",
            language="English",
            duration=10,
            price=0.00,
            status="approved"
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course,
            status="approved"
        )

    def test_rest_history_endpoint_permissions_and_retrieval(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("chat_history", kwargs={"course_id": self.course.id})
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        results = response.data.get("results") if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 0)

        # Try non-enrolled student
        other_student = User.objects.create_user(
            username="other_student_2",
            email="other2@test.com",
            password="password123",
            role="student"
        )
        self.client.force_authenticate(user=other_student)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)


