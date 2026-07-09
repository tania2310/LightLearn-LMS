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

urlpatterns = router.urls
urlpatterns += [
    path(
        "courses/<int:course_id>/certificate/",
        CertificateView.as_view(),
        name="certificate",
    ),
]