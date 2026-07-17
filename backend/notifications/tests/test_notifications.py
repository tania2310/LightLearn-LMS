from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core import mail
from unittest.mock import patch
from courses.models import Course, Enrollment, Module, Lesson
from qa.models import Question
from payments.models import RefundRequest
from notifications.models import Notification
from notifications.services import (
    notify_user,
    send_enrollment_notification,
    send_new_lesson_notification,
    send_qa_answered_notification,
    send_refund_notification,
    send_course_announcement
)

User = get_user_model()

class NotificationTests(APITestCase):

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
            title="French Intermediate",
            description="Grammar lessons.",
            category="Languages",
            level="intermediate",
            language="French",
            duration=4,
            price=30.00,
            status="approved"
        )
        self.module = Module.objects.create(course=self.course, title="Module 1", order=1)
        self.enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course,
            status="approved"
        )
        self.list_url = reverse("notification-list")
        self.unread_url = reverse("notification-unread")
        self.mark_all_read_url = reverse("notification-mark-all-read")

    @patch("notifications.services.get_channel_layer")
    def test_notify_user_creates_db_record_and_emails(self, mock_get_channel_layer):
        mail.outbox = []
        notification = notify_user(
            recipient=self.student,
            title="Hello",
            message="World",
            notification_type="System"
        )
        
        self.assertEqual(Notification.objects.count(), 1)
        self.assertEqual(notification.title, "Hello")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Hello")

    @patch("notifications.services.get_channel_layer")
    def test_notification_endpoints(self, mock_get_channel_layer):
        Notification.objects.create(
            recipient=self.student,
            title="Note 1",
            message="Msg 1",
            notification_type="System",
            is_read=False
        )
        Notification.objects.create(
            recipient=self.student,
            title="Note 2",
            message="Msg 2",
            notification_type="System",
            is_read=True
        )

        self.client.force_authenticate(user=self.student)
        
        # Test GET /api/notifications/
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # Test GET /api/notifications/unread/
        response = self.client.get(self.unread_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Note 1")

        # Test POST /api/notifications/<id>/mark-read/
        unread_note = Notification.objects.filter(recipient=self.student, is_read=False).first()
        mark_read_url = reverse("notification-mark-read", args=[unread_note.id])
        response = self.client.post(mark_read_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        unread_note.refresh_from_db()
        self.assertTrue(unread_note.is_read)

        # Reset unread
        unread_note.is_read = False
        unread_note.save()

        # Test POST /api/notifications/mark-all-read/
        response = self.client.post(self.mark_all_read_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=self.student, is_read=False).count(), 0)

    @patch("notifications.services.get_channel_layer")
    def test_enrollment_notification_trigger(self, mock_get_channel_layer):
        Enrollment.objects.all().delete()
        new_enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course,
            status="approved"
        )
        send_enrollment_notification(new_enrollment)
        
        last_note = Notification.objects.last()
        self.assertIsNotNone(last_note)
        self.assertEqual(last_note.notification_type, "Enrollment")
        self.assertIn("French Intermediate", last_note.message)

    @patch("notifications.services.get_channel_layer")
    def test_new_lesson_notification_trigger(self, mock_get_channel_layer):
        lesson = Lesson.objects.create(
            module=self.module,
            title="Intro to French Verbs",
            content="Verbs content"
        )
        send_new_lesson_notification(lesson)

        last_note = Notification.objects.last()
        self.assertIsNotNone(last_note)
        self.assertEqual(last_note.notification_type, "Lesson")
        self.assertIn("Intro to French Verbs", last_note.message)

    @patch("notifications.services.get_channel_layer")
    def test_qa_answered_notification_trigger(self, mock_get_channel_layer):
        question = Question.objects.create(
            course=self.course,
            student=self.student,
            question="What is comment dit-on?"
        )
        send_qa_answered_notification(question)

        last_note = Notification.objects.last()
        self.assertIsNotNone(last_note)
        self.assertEqual(last_note.notification_type, "QA")
        self.assertIn("answered", last_note.message)

    @patch("notifications.services.get_channel_layer")
    def test_refund_notification_trigger(self, mock_get_channel_layer):
        refund_req = RefundRequest.objects.create(
            student=self.student,
            enrollment=self.enrollment,
            reason="Not useful",
            status="Approved"
        )
        send_refund_notification(refund_req)

        last_note = Notification.objects.last()
        self.assertIsNotNone(last_note)
        self.assertEqual(last_note.notification_type, "Refund")
        self.assertEqual(last_note.title, "Refund Request Approved")

    @patch("notifications.services.get_channel_layer")
    def test_course_announcement_trigger(self, mock_get_channel_layer):
        send_course_announcement(self.course, "Exam scheduled", "Next Monday")

        last_note = Notification.objects.last()
        self.assertIsNotNone(last_note)
        self.assertEqual(last_note.notification_type, "Announcement")
        self.assertEqual(last_note.message, "Next Monday")
