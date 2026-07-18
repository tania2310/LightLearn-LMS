from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from courses.models import Course

User = get_user_model()

class CourseManagementTests(APITestCase):

    def setUp(self):
        self.mentor = User.objects.create_user(
            username="mentor_user",
            email="mentor@example.com",
            password="password123",
            role="mentor",
            is_approved=True
        )
        self.admin = User.objects.create_superuser(
            username="admin_user",
            email="admin@example.com",
            password="password123",
            role="admin"
        )
        self.course_data = {
            "title": "Introduction to Python",
            "description": "Learn basic Python concepts.",
            "category": "Programming",
            "level": "beginner",
            "language": "English",
            "duration": 10,
            "price": 100.00
        }
        self.course_list_url = reverse("course-list") # Registered via DefaultRouter in courses/urls.py

    def test_mentor_can_create_draft_course(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.post(self.course_list_url, self.course_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Course.objects.count(), 1)
        
        course = Course.objects.first()
        self.assertEqual(course.status, "draft")

    def test_admin_can_approve_course(self):
        # Create a pending course first
        course = Course.objects.create(
            mentor=self.mentor,
            title="Advanced Python",
            description="Intermediate concepts.",
            category="Programming",
            level="intermediate",
            language="English",
            duration=12,
            price=200.00,
            status="pending"
        )
        approve_url = reverse("course-approve", args=[course.id])

        # Approve as Admin (authorized)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(approve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        course.refresh_from_db()
        self.assertEqual(course.status, "approved")
