from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from unittest.mock import patch
from courses.models import Course

User = get_user_model()

class SearchAndFilterTests(APITestCase):

    def setUp(self):
        self.mentor = User.objects.create_user(
            username="mentor_search",
            email="mentor_search@example.com",
            password="password123",
            role="mentor",
            is_approved=True
        )
        self.student = User.objects.create_user(
            username="student_search",
            email="student_search@example.com",
            password="password123",
            role="student"
        )
        # Course 1: JavaScript Beginners, Category: Programming, Level: beginner, Language: English, Price: 10, Duration: 5
        self.course1 = Course.objects.create(
            mentor=self.mentor,
            title="JS Beginners Guide",
            description="Learn javascript from scratch.",
            category="Programming",
            level="beginner",
            language="English",
            duration=5,
            price=10.00,
            status="approved",
            tags="javascript beginner js"
        )
        # Course 2: Advanced React, Category: Programming, Level: advanced, Language: English, Price: 50, Duration: 15
        self.course2 = Course.objects.create(
            mentor=self.mentor,
            title="Advanced React JS",
            description="Deep dive react.",
            category="Programming",
            level="advanced",
            language="English",
            duration=15,
            price=50.00,
            status="approved",
            tags="react js web"
        )
        # Course 3: French for Advanced, Category: Languages, Level: advanced, Language: French, Price: 20, Duration: 8
        self.course3 = Course.objects.create(
            mentor=self.mentor,
            title="French Intermediate",
            description="Learn intermediate french grammar.",
            category="Languages",
            level="intermediate",
            language="French",
            duration=8,
            price=20.00,
            status="approved",
            tags="french language"
        )
        # Import Review and create them
        from courses.models import Review
        Review.objects.create(student=self.student, course=self.course1, rating=5, comment="Great")
        Review.objects.create(student=self.student, course=self.course2, rating=4, comment="Good")
        Review.objects.create(student=self.student, course=self.course3, rating=3, comment="Ok")

        self.course_search_url = reverse("search-courses")
        self.mentor_search_url = reverse("search-mentors")

    @patch("search.views.CourseDocument.search")
    def test_search_by_tag_via_orm_fallback(self, mock_es_search):
        # Force ES exception to trigger ORM database fallback
        mock_es_search.side_effect = Exception("ES connection failure simulation")
        self.client.force_authenticate(user=self.student)

        # Search for tags "french"
        response = self.client.get(self.course_search_url, {"q": "french"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "French Intermediate")

    @patch("search.views.CourseDocument.search")
    def test_combined_filters_via_orm_fallback(self, mock_es_search):
        mock_es_search.side_effect = Exception("ES connection failure simulation")
        self.client.force_authenticate(user=self.student)

        # Filters: level=advanced, language=English, min_rating=4.0
        params = {
            "level": "advanced",
            "language": "English",
            "min_rating": 4.0
        }
        response = self.client.get(self.course_search_url, params)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Advanced React JS")

    @patch("search.views.CourseDocument.search")
    def test_sorting_by_price_and_rating_via_orm_fallback(self, mock_es_search):
        mock_es_search.side_effect = Exception("ES connection failure simulation")
        self.client.force_authenticate(user=self.student)

        # Ordering by price (low to high)
        response = self.client.get(self.course_search_url, {"ordering": "price"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prices = [float(c["price"]) for c in response.data]
        self.assertEqual(prices, [10.00, 20.00, 50.00])

        # Ordering by price descending
        response = self.client.get(self.course_search_url, {"ordering": "-price"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prices = [float(c["price"]) for c in response.data]
        self.assertEqual(prices, [50.00, 20.00, 10.00])

        # Ordering by rating descending
        response = self.client.get(self.course_search_url, {"ordering": "-rating"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ratings = [float(c["average_rating"]) for c in response.data]
        self.assertEqual(ratings, [5.0, 4.0, 3.0])
