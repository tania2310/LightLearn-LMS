from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from courses.models import Course, Enrollment, Review

User = get_user_model()

class ReviewManagementTests(APITestCase):

    def setUp(self):
        self.mentor = User.objects.create_user(
            username="mentor_user",
            email="mentor@example.com",
            password="password123",
            role="mentor",
            is_approved=True
        )
        self.student1 = User.objects.create_user(
            username="student_one",
            email="student1@example.com",
            password="password123",
            role="student",
            is_approved=True
        )
        self.student2 = User.objects.create_user(
            username="student_two",
            email="student2@example.com",
            password="password123",
            role="student",
            is_approved=True
        )
        self.course = Course.objects.create(
            mentor=self.mentor,
            title="Premium Spanish",
            description="Grammar rules.",
            category="Languages",
            level="intermediate",
            language="English",
            duration=6,
            price=50.00,
            status="approved"
        )
        self.reviews_url = reverse("review-list")

    def test_enrolled_student_can_submit_review(self):
        # Unenrolled student fails
        self.client.force_authenticate(user=self.student1)
        payload = {"course": self.course.id, "rating": 5, "comment": "Spanish is great!"}
        response = self.client.post(self.reviews_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Enrolled student succeeds
        Enrollment.objects.create(student=self.student1, course=self.course, status="approved")
        response = self.client.post(self.reviews_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_student_cannot_submit_duplicate_review(self):
        Enrollment.objects.create(student=self.student1, course=self.course, status="approved")
        
        # Submit first review
        Review.objects.create(student=self.student1, course=self.course, rating=5, comment="Spanish is great!")
        
        # Submit duplicate review
        self.client.force_authenticate(user=self.student1)
        payload = {"course": self.course.id, "rating": 4, "comment": "Another review!"}
        response = self.client.post(self.reviews_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_can_edit_own_review_only(self):
        Enrollment.objects.create(student=self.student1, course=self.course, status="approved")
        review = Review.objects.create(student=self.student1, course=self.course, rating=5, comment="Love it!")
        detail_url = reverse("review-detail", args=[review.id])

        # Student2 tries to edit Student1's review
        self.client.force_authenticate(user=self.student2)
        payload = {"course": self.course.id, "rating": 1, "comment": "Hate it!"}
        response = self.client.put(detail_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Student1 edits their own review
        self.client.force_authenticate(user=self.student1)
        payload = {"course": self.course.id, "rating": 4, "comment": "Changed my mind, 4 stars."}
        response = self.client.put(detail_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        review.refresh_from_db()
        self.assertEqual(review.rating, 4)

    def test_bayesian_rating_calculations(self):
        # We need at least m=2 ratings to trigger Bayesian weighted rating calculations.
        # R = course average, v = review count, C = platform average.
        # Let's enroll and create ratings:
        Enrollment.objects.create(student=self.student1, course=self.course, status="approved")
        Enrollment.objects.create(student=self.student2, course=self.course, status="approved")

        Review.objects.create(student=self.student1, course=self.course, rating=5, comment="Spanish is great!")
        Review.objects.create(student=self.student2, course=self.course, rating=3, comment=" испанский")

        # Course average (R) = 4.0
        # v = 2, m = 2. C (platform average) = 4.0.
        # Weighted Rating = (2 / (2 + 2)) * 4.0 + (2 / (2 + 2)) * 4.0 = 4.0
        self.assertEqual(self.course.average_rating, 4.0)

    def test_hidden_reviews_are_excluded_from_rating(self):
        Enrollment.objects.create(student=self.student1, course=self.course, status="approved")
        Enrollment.objects.create(student=self.student2, course=self.course, status="approved")

        Review.objects.create(student=self.student1, course=self.course, rating=5, comment="Spanish is great!")
        hidden_review = Review.objects.create(
            student=self.student2, 
            course=self.course, 
            rating=1, 
            comment="Bad words", 
            is_hidden=True
        )

        # Since hidden_review is hidden, active reviews count is 1 (fewer than m=2).
        # Fallback average rating calculation uses only the non-hidden review (5.0 rating)
        self.assertEqual(self.course.average_rating, 5.0)
