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
    ReviewReportViewSet,
    CertificateView,
    CertificateViewSet,
    AdminStatsView,
    pending_enrollments,
    approve_enrollment,
    AdminReportView,
)
from django.urls import path

router = DefaultRouter()

router.register(r"courses", CourseViewSet)
router.register(r"modules", ModuleViewSet)
router.register(r"lessons", LessonViewSet)
router.register(
    r"enrollments",
    EnrollmentViewSet,
    basename="enrollment",
)
router.register(r"progress", ProgressViewSet)
router.register(r"quizzes", QuizViewSet)
router.register(r"questions", QuestionViewSet)
router.register(r"reviews/reports", ReviewReportViewSet, basename="reviewreport")
router.register(r"reviews", ReviewViewSet)
router.register(r"certificates", CertificateViewSet)

urlpatterns = router.urls
urlpatterns += [
    path(
        "courses/<int:course_id>/certificate/",
        CertificateView.as_view(),
        name="certificate",
    ),
    path(
        "admin/stats/",
        AdminStatsView.as_view(),
    ),
    path(
        "admin/reports/",
        AdminReportView.as_view(),
        name="admin-reports",
    ),
    path(
        "enrollments/pending/",
        pending_enrollments,
    ),
    path(
        "enrollments/approve/<int:enrollment_id>/",
        approve_enrollment,
    ),
]