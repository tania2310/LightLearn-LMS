from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from courses.models import Course

User = get_user_model()

class CourseSubmissionTests(APITestCase):

    def setUp(self):
        self.mentor = User.objects.create_user(
            username="mentor_user",
            email="mentor@example.com",
            password="password123",
            role="mentor",
            is_approved=True
        )
        self.other_mentor = User.objects.create_user(
            username="other_mentor",
            email="other_mentor@example.com",
            password="password123",
            role="mentor",
            is_approved=True
        )
        self.student = User.objects.create_user(
            username="student_user",
            email="student@example.com",
            password="password123",
            role="student"
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
        self.course_list_url = reverse("course-list")

    def test_mentor_creates_course_as_draft(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.post(self.course_list_url, self.course_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        course = Course.objects.first()
        self.assertEqual(course.status, "draft")

    def test_draft_course_submits_for_approval_successfully(self):
        self.client.force_authenticate(user=self.mentor)
        response = self.client.post(self.course_list_url, self.course_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        course = Course.objects.first()
        
        submit_url = reverse("course-submit-for-approval", args=[course.id])
        submit_response = self.client.post(submit_url)
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_response.data["status"], "Pending")
        self.assertEqual(submit_response.data["message"], "Course submitted for approval.")
        
        course.refresh_from_db()
        self.assertEqual(course.status, "pending")

    def test_non_owner_cannot_submit(self):
        self.client.force_authenticate(user=self.mentor)
        self.client.post(self.course_list_url, self.course_data, format="json")
        course = Course.objects.first()
        
        submit_url = reverse("course-submit-for-approval", args=[course.id])
        
        # Test non-owner mentor
        self.client.force_authenticate(user=self.other_mentor)
        submit_response = self.client.post(submit_url)
        self.assertEqual(submit_response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Test student
        self.client.force_authenticate(user=self.student)
        submit_response = self.client.post(submit_url)
        self.assertEqual(submit_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pending_course_cannot_be_resubmitted(self):
        self.client.force_authenticate(user=self.mentor)
        self.client.post(self.course_list_url, self.course_data, format="json")
        course = Course.objects.first()
        
        submit_url = reverse("course-submit-for-approval", args=[course.id])
        
        # First submission
        submit_response = self.client.post(submit_url)
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)
        
        # Second submission
        resubmit_response = self.client.post(submit_url)
        self.assertEqual(resubmit_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approved_course_cannot_be_resubmitted(self):
        # Create course directly as approved
        course = Course.objects.create(
            mentor=self.mentor,
            title="Advanced Java",
            description="Complex Java.",
            category="Programming",
            level="advanced",
            language="English",
            duration=15,
            price=150.00,
            status="approved"
        )
        
        submit_url = reverse("course-submit-for-approval", args=[course.id])
        self.client.force_authenticate(user=self.mentor)
        submit_response = self.client.post(submit_url)
        self.assertEqual(submit_response.status_code, status.HTTP_400_BAD_REQUEST)
