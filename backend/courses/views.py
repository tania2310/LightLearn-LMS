from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from rest_framework.views import APIView
from .models import (
    Course,
    Module,
    Lesson,
    Enrollment,
    Progress,
    Quiz,
    Question,
    Review,
    Certificate,
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
    CertificateSerializer,
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
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    filterset_fields = [
        "category",
        "level",
        "language",
        "status",
    ]

    search_fields = [
        "title",
        "description",
        "category",
    ]

    ordering_fields = [
        "price",
        "duration",
        "created_at",
    ]

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

class CertificateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = Course.objects.get(id=course_id)

        # Check enrollment first
        if not Enrollment.objects.filter(
            student=request.user,
            course=course
        ).exists():
            return Response(
                {"error": "You are not enrolled in this course."},
                status=400,
            )

        # Get all lessons in the course
        lessons = Lesson.objects.filter(module__course=course)

        total_lessons = lessons.count()

        completed_lessons = Progress.objects.filter(
            student=request.user,
            lesson__in=lessons,
            completed=True,
        ).count()
        
        if total_lessons == 0:
            return Response(
                {"error": "This course has no lessons yet."},
                status=400,
            )

        if completed_lessons < total_lessons:
            return Response(
                {"error": "Complete all lessons before receiving the certificate."},
                status=400,
            )
        certificate, created = Certificate.objects.get_or_create(
            student=request.user,
            course=course,
        )

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="{course.title}_certificate.pdf"'
        )

        p = canvas.Canvas(response)

        p.setFont("Helvetica-Bold", 22)
        p.drawString(120, 760, "Certificate of Completion")

        p.setFont("Helvetica", 16)
        p.drawString(
            80,
            700,
            f"This certifies that {request.user.username}"
        )

        p.drawString(
            80,
            670,
            f"has successfully completed"
        )

        p.setFont("Helvetica-Bold", 18)
        p.drawString(
            80,
            630,
            course.title
        )

        p.save()

        return response

class CertificateViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)