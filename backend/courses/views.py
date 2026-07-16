from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
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
User = get_user_model()
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
        serializer.save(
            mentor=self.request.user,
            status="pending"
        )
    def perform_update(self, serializer):
        if self.request.user.role == "mentor":
            serializer.save(status="pending")
        else:
            serializer.save()

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

    @action(detail=False, methods=["get"], permission_classes=[IsAdmin])
    def pending(self, request):
        serializer = self.get_serializer(
            Course.objects.filter(status="pending"),
            many=True
        )
        return Response(serializer.data)

class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer

    def get_permissions(self):

        if self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
            return [IsMentor()]

        return [IsAuthenticated()]

class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer

    def get_permissions(self):
        if self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
        ]:
            return [IsMentor()]

        return [IsAuthenticated()]

class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == "admin":
            return Enrollment.objects.all()

        return Enrollment.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        serializer.save(
            student=self.request.user,
            status="pending",
        )
class ProgressViewSet(viewsets.ModelViewSet):
    queryset = Progress.objects.all()
    serializer_class = ProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Progress.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        lesson = serializer.validated_data["lesson"]

        Progress.objects.update_or_create(
            student=self.request.user,
            lesson=lesson,
            defaults={"completed": True},
        )

class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        lesson = self.request.query_params.get("lesson")

        if lesson:
            return Quiz.objects.filter(lesson=lesson)

        return Quiz.objects.all()

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        quiz = self.get_object()

        answers = request.data.get("answers", {})

        score = 0

        for question in quiz.questions.all():
            answer = int(answers.get(str(question.id), 0))

            if answer == question.correct_option:
                score += 1
        
        return Response({
            "score": score,
            "total": quiz.questions.count(),
            "passed": score >= quiz.questions.count() * 0.5
        })


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

class AdminStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        data = {
            "students": User.objects.filter(role="student").count(),
            "mentors": User.objects.filter(role="mentor").count(),
            "courses": Course.objects.count(),
            "pending": Course.objects.filter(status="pending").count(),
            "approved": Course.objects.filter(status="approved").count(),
            "rejected": Course.objects.filter(status="rejected").count(),
        }

        return Response(data)

@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_stats(request):
    return Response({
        "users": User.objects.count(),
        "students": User.objects.filter(role="student").count(),
        "mentors": User.objects.filter(role="mentor").count(),
        "courses": Course.objects.count(),
        "pending": Course.objects.filter(status="pending").count(),
        "approved": Course.objects.filter(status="approved").count(),
    })

@api_view(["GET"])
@permission_classes([IsAdminUser])
def pending_enrollments(request):
    enrollments = Enrollment.objects.filter(status="pending")
    serializer = EnrollmentSerializer(enrollments, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_enrollment(request, enrollment_id):
    enrollment = Enrollment.objects.get(id=enrollment_id)

    enrollment.status = "approved"
    enrollment.save()

    return Response({
        "message": "Enrollment approved."
    })

@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_enrollment(request, enrollment_id):
    enrollment = Enrollment.objects.get(id=enrollment_id)

    enrollment.status = "approved"
    enrollment.save()

    return Response({
        "message": "Enrollment approved successfully."
    })