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
    ReviewReport,
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
    ReviewReportSerializer,
)
from .permissions import IsMentor, IsOwnerOrReadOnly, IsAdmin, IsReviewOwnerOrReadOnly
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
        course = serializer.save(
            mentor=self.request.user,
            status="draft"
        )
        try:
            from search.indexing import update_course_index
            update_course_index(course)
        except Exception:
            pass

    def perform_update(self, serializer):
        if self.request.user.role == "mentor":
            course = serializer.save(status="pending")
        else:
            course = serializer.save()
        try:
            from search.indexing import update_course_index
            update_course_index(course)
        except Exception:
            pass

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

    @action(detail=True, methods=["post"], url_path="submit-for-approval", permission_classes=[IsAuthenticated])
    def submit_for_approval(self, request, pk=None):
        if request.user.role != "mentor":
            return Response(
                {"error": "Only mentors can submit courses for approval."},
                status=status.HTTP_403_FORBIDDEN
            )

        course = self.get_object()

        if course.mentor != request.user:
            return Response(
                {"error": "Only the course owner may submit this course."},
                status=status.HTTP_403_FORBIDDEN
            )

        if course.status in ["pending", "approved"]:
            return Response(
                {"error": f"Course is already {course.get_status_display()}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if course.status != "draft":
            return Response(
                {"error": "Only draft courses can be submitted for approval."},
                status=status.HTTP_400_BAD_REQUEST
            )

        course.status = "pending"
        course.save()

        try:
            from search.indexing import update_course_index
            update_course_index(course)
        except Exception:
            pass

        return Response(
            {
                "message": "Course submitted for approval.",
                "status": "Pending"
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], permission_classes=[IsMentor])
    def announce(self, request, pk=None):
        course = self.get_object()
        title = request.data.get("title", "Course Announcement")
        message = request.data.get("message")
        if not message:
            return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from notifications.services import send_course_announcement
            send_course_announcement(course, title, message)
        except Exception as e:
            pass
        return Response({"message": "Announcement sent successfully."})
    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        course = self.get_object()

        course.status = "approved"
        course.save()
        try:
            from search.indexing import update_course_index
            update_course_index(course)
        except Exception:
            pass

        return Response(
            {"message": "Course approved successfully."}
        )
    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        course = self.get_object()

        course.status = "rejected"
        course.save()
        try:
            from search.indexing import update_course_index
            update_course_index(course)
        except Exception:
            pass

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

    def perform_create(self, serializer):
        lesson = serializer.save()
        try:
            from notifications.services import send_new_lesson_notification
            send_new_lesson_notification(lesson)
        except Exception as e:
            pass

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
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == "admin":
            return Enrollment.objects.all()

        return Enrollment.objects.filter(student=user)

    def perform_create(self, serializer):
        serializer.save(
            student=self.request.user,
            status="pending",
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.status = "approved"
        enrollment.save()
        try:
            from notifications.services import send_enrollment_notification
            send_enrollment_notification(enrollment)
        except Exception as e:
            pass

        return Response({"message": "Enrollment approved."})

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.status = "rejected"
        enrollment.save()

        return Response({"message": "Enrollment rejected."})

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

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsReviewOwnerOrReadOnly()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        course = serializer.validated_data.get('course')
        if not Enrollment.objects.filter(student=self.request.user, course=course).exists():
            raise ValidationError("Only enrolled students can submit reviews.")
        if Review.objects.filter(student=self.request.user, course=course).exists():
            raise ValidationError("You have already reviewed this course.")
        serializer.save(student=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def report(self, request, pk=None):
        review = self.get_object()
        reason = request.data.get("reason")
        description = request.data.get("description", "")

        if not reason:
            return Response({"error": "Reason is required."}, status=400)

        if ReviewReport.objects.filter(reported_by=request.user, review=review).exists():
            return Response({"error": "You have already reported this review."}, status=400)

        report = ReviewReport.objects.create(
            review=review,
            reported_by=request.user,
            reason=reason,
            description=description
        )
        return Response({"message": "Abuse report submitted successfully."}, status=201)

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def hide(self, request, pk=None):
        review = self.get_object()
        review.is_hidden = True
        review.hidden_at = timezone.now()
        review.hidden_by = request.user
        review.save()
        return Response({"message": "Review hidden by moderator."})

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def restore(self, request, pk=None):
        review = self.get_object()
        review.is_hidden = False
        review.hidden_at = None
        review.hidden_by = None
        review.save()
        return Response({"message": "Review restored."})

class ReviewReportViewSet(viewsets.ModelViewSet):
    queryset = ReviewReport.objects.all().order_by('-created_at')
    serializer_class = ReviewReportSerializer
    permission_classes = [IsAdmin]

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def dismiss(self, request, pk=None):
        report = self.get_object()
        report.status = "Dismissed"
        report.reviewed_at = timezone.now()
        report.save()
        return Response({"message": "Abuse report dismissed."})

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def reviewed(self, request, pk=None):
        report = self.get_object()
        report.status = "Reviewed"
        report.reviewed_at = timezone.now()
        report.save()
        return Response({"message": "Abuse report marked as reviewed."})

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

        # Check for approved refund request
        from payments.models import RefundRequest
        if RefundRequest.objects.filter(
            student=request.user,
            enrollment__course=course,
            status="Approved"
        ).exists():
            return Response(
                {"error": "You have been refunded for this course."},
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
            "users": User.objects.count(),
            "approved_mentors": User.objects.filter(role="mentor", is_approved=True).count(),
            "pending_mentors": User.objects.filter(role="mentor", is_approved=False).count(),
            "enrollments": Enrollment.objects.count(),
            "certificates": Certificate.objects.count(),
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
    try:
        from notifications.services import send_enrollment_notification
        send_enrollment_notification(enrollment)
    except Exception as e:
        pass

    return Response({
        "message": "Enrollment approved."
    })

# Duplicate kept to comply with non-deletion rule but updated to trigger notifications
@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_enrollment_duplicate(request, enrollment_id):
    enrollment = Enrollment.objects.get(id=enrollment_id)

    enrollment.status = "approved"
    enrollment.save()
    try:
        from notifications.services import send_enrollment_notification
        send_enrollment_notification(enrollment)
    except Exception as e:
        pass

    return Response({
        "message": "Enrollment approved successfully."
    })

from reportlab.lib.pagesizes import letter
from django.utils import timezone

class AdminReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        report_type = request.query_params.get("type", "users")
        
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="admin_{report_type}_report.pdf"'
        
        p = canvas.Canvas(response, pagesize=letter)
        p.setFont("Helvetica-Bold", 20)
        p.drawString(100, 750, f"LightLearn LMS - {report_type.capitalize()} Report")
        p.setFont("Helvetica", 10)
        p.drawString(100, 730, f"Generated at: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        p.line(100, 720, 500, 720)
        
        y = 690
        
        if report_type == "users":
            users = User.objects.all().order_by("id")
            p.drawString(100, y, "ID | Username | Email | Role | Approved | Verified")
            y -= 20
            p.line(100, y + 10, 500, y + 10)
            for u in users:
                if y < 50:
                    p.showPage()
                    p.setFont("Helvetica", 10)
                    y = 750
                p.drawString(100, y, f"{u.id} | {u.username} | {u.email} | {u.role} | {u.is_approved} | {u.is_email_verified}")
                y -= 20
                
        elif report_type == "courses":
            courses = Course.objects.all().order_by("id")
            p.drawString(100, y, "ID | Title | Mentor | Category | Status")
            y -= 20
            p.line(100, y + 10, 500, y + 10)
            for c in courses:
                if y < 50:
                    p.showPage()
                    p.setFont("Helvetica", 10)
                    y = 750
                mentor_username = c.mentor.username if c.mentor else "None"
                title_str = (c.title[:20] + "...") if len(c.title) > 20 else c.title
                p.drawString(100, y, f"{c.id} | {title_str} | {mentor_username} | {c.category} | {c.status}")
                y -= 20
                
        elif report_type == "enrollments":
            enrollments = Enrollment.objects.all().order_by("id")
            p.drawString(100, y, "ID | Student | Course | Status | Enrolled At")
            y -= 20
            p.line(100, y + 10, 500, y + 10)
            for e in enrollments:
                if y < 50:
                    p.showPage()
                    p.setFont("Helvetica", 10)
                    y = 750
                student_username = e.student.username if e.student else "None"
                course_title = (e.course.title[:20] + "...") if e.course and len(e.course.title) > 20 else (e.course.title if e.course else "None")
                enrolled_date = e.enrolled_at.strftime('%Y-%m-%d') if e.enrolled_at else "None"
                p.drawString(100, y, f"{e.id} | {student_username} | {course_title} | {e.status} | {enrolled_date}")
                y -= 20
                
        elif report_type == "certificates":
            certificates = Certificate.objects.all().order_by("id")
            p.drawString(100, y, "ID | Student | Course | Issued At")
            y -= 20
            p.line(100, y + 10, 500, y + 10)
            for cert in certificates:
                if y < 50:
                    p.showPage()
                    p.setFont("Helvetica", 10)
                    y = 750
                student_username = cert.student.username if cert.student else "None"
                course_title = (cert.course.title[:20] + "...") if cert.course and len(cert.course.title) > 20 else (cert.course.title if cert.course else "None")
                issued_date = cert.issued_at.strftime('%Y-%m-%d') if cert.issued_at else "None"
                p.drawString(100, y, f"{cert.id} | {student_username} | {course_title} | {issued_date}")
                y -= 20
                
        p.save()
        return response