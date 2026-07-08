from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    Course,
    Module,
    Lesson,
    Enrollment,
    Progress,
    Quiz,
    Question,
    Review,
)
from .serializers import (
    CourseSerializer,
    ModuleSerializer,
    LessonSerializer,
    EnrollmentSerializer,
    ProgressSerializer,
    QuizSerializer,
    QuestionSerializer,
    ReviewSerializer,
)
from .permissions import IsMentor, IsOwnerOrReadOnly, IsAdmin

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()      # <-- add this
    serializer_class = CourseSerializer

    def get_queryset(self):
        user = self.request.user

        if user.role == "admin":
            return Course.objects.all()

        elif user.role == "mentor":
            return Course.objects.filter(mentor=user)

        return Course.objects.filter(status="approved")

    def get_permissions(self):
        if self.action == "create":
            return [IsMentor()]

        elif self.action in ["update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsOwnerOrReadOnly()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(mentor=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def submit(self, request, pk=None):
        course = self.get_object()

        if course.mentor != request.user:
            return Response(
                {"error": "Only the mentor can submit this course."},
                status=status.HTTP_403_FORBIDDEN,
            )

        course.status = "pending"
        course.save()

        return Response(
            {"message": "Course submitted for approval."},
            status=status.HTTP_200_OK,
        )
    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        course = self.get_object()

        course.status = "approved"
        course.save()

        return Response(
            {"message": "Course approved successfully."}
        )
    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        course = self.get_object()

        course.status = "rejected"
        course.save()

        return Response(
            {"message": "Course rejected."}
        )

class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated]


class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]

class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

class ProgressViewSet(viewsets.ModelViewSet):
    queryset = Progress.objects.all()
    serializer_class = ProgressSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)