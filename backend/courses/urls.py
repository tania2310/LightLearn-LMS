from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet,
    ModuleViewSet,
    LessonViewSet,
    EnrollmentViewSet,
    ProgressViewSet,
    QuizViewSet,
    QuestionViewSet,
    ReviewViewSet,
    CertificateView,
    CertificateViewSet,
    AdminStatsView,
    pending_enrollments,
    approve_enrollment,
)
from django.urls import path

router = DefaultRouter()

router.register(r"courses", CourseViewSet)
router.register(r"modules", ModuleViewSet)
router.register(r"lessons", LessonViewSet)
router.register(r"enrollments", EnrollmentViewSet)
router.register(r"progress", ProgressViewSet)
router.register(r"quizzes", QuizViewSet)
router.register(r"questions", QuestionViewSet)
router.register(r"reviews", ReviewViewSet)
router.register(r"certificates", CertificateViewSet)

urlpatterns = router.urls
urlpatterns += [
    path(
        "courses/<int:course_id>/certificate/",
        CertificateView.as_view(),
        name="certificate",
    ),
]
path("admin/stats/", AdminStatsView.as_view()),
path(
    "enrollments/pending/",
    pending_enrollments,
),

path(
    "enrollments/approve/<int:enrollment_id>/",
    approve_enrollment,
),