from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet,
    ModuleViewSet,
    LessonViewSet,
    EnrollmentViewSet,
    ProgressViewSet,
)

router = DefaultRouter()

router.register(r"courses", CourseViewSet)
router.register(r"modules", ModuleViewSet)
router.register(r"lessons", LessonViewSet)
router.register(r"enrollments", EnrollmentViewSet)
router.register(r"progress", ProgressViewSet)

urlpatterns = router.urls