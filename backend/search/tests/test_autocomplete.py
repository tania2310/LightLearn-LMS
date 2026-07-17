from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from unittest.mock import patch
from courses.models import Course

User = get_user_model()

class AutocompleteTests(APITestCase):

    def setUp(self):
        self.mentor = User.objects.create_user(
            username="mentor_auto",
            email="mentor_auto@example.com",
            password="password123",
            role="mentor",
            is_approved=True
        )
        self.student = User.objects.create_user(
            username="student_auto",
            email="student_auto@example.com",
            password="password123",
            role="student"
        )
        self.course = Course.objects.create(
            mentor=self.mentor,
            title="Introduction to Machine Learning",
            description="ML core concepts.",
            category="Programming",
            level="beginner",
            language="English",
            duration=6,
            price=20.00,
            status="approved",
            tags="ml learning data"
        )
        self.url = reverse("search-autocomplete")

    def test_empty_autocomplete_query(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self.url, {"q": ""})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["courses"], [])
        self.assertEqual(response.data["mentors"], [])

    @patch("search.views.CourseDocument.search")
    def test_autocomplete_orm_fallback(self, mock_es_search):
        mock_es_search.side_effect = Exception("ES connection failure simulation")
        self.client.force_authenticate(user=self.student)

        # Autocomplete query matching 'machine'
        response = self.client.get(self.url, {"q": "machine"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["courses"]), 1)
        self.assertEqual(response.data["courses"][0]["title"], "Introduction to Machine Learning")

    @patch("search.views.CourseDocument.search")
    def test_autocomplete_synonyms_matching_orm_fallback(self, mock_es_search):
        # In the database fallback pathway, since database doesn't parse ES synonyms directly, 
        # let's verify synonym matching using standard view fallback handling logic.
        mock_es_search.side_effect = Exception("ES connection failure simulation")
        self.client.force_authenticate(user=self.student)

        # Typing 'ml' matches tags contains 'ml'
        response = self.client.get(self.url, {"q": "ml"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["courses"]), 1)
        self.assertEqual(response.data["courses"][0]["title"], "Introduction to Machine Learning")
