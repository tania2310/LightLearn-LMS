from rest_framework import serializers
from django.db.models import Avg
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


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = "__all__"


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = "__all__"


class CourseSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)
    average_rating = serializers.ReadOnlyField()
    mentor = serializers.StringRelatedField(read_only=True)
    thumbnail = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()

    def get_thumbnail(self, obj):
        request = self.context.get("request")
        if obj.thumbnail:
            return request.build_absolute_uri(obj.thumbnail.url)
        return None

    def get_enrolled_count(self, obj):
        return obj.enrollments.filter(status="approved").count()

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            user = request.user
            if user.role == "student":
                is_approved = instance.enrollments.filter(student=user, status="approved").exists()
                if not is_approved:
                    rep["modules"] = []
        else:
            rep["modules"] = []
        return rep

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = ["mentor"]

class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(
        source="course.title",
        read_only=True
    )

    mentor = serializers.CharField(
        source="course.mentor.username",
        read_only=True
    )

    progress = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = "__all__"
        read_only_fields = ["student"]

    def get_progress(self, obj):
        student = obj.student
        course = obj.course

        # Fetch modules and lessons ordered by 'order' to match client-side logic
        modules = list(course.modules.all().order_by("order"))

        all_lessons = []
        module_lessons_map = {}
        for m in modules:
            m_lessons = list(m.lessons.all().order_by("order"))
            module_lessons_map[m.id] = m_lessons
            all_lessons.extend(m_lessons)

        total_lessons = len(all_lessons)
        if total_lessons == 0:
            return {
                "percent": 0,
                "completed_count": 0,
                "total_count": 0,
                "current_module_number": 0,
                "total_modules": len(modules),
                "current_module_title": "No modules yet",
                "current_lesson_number": 0,
                "total_module_lessons": 0,
                "current_lesson_title": "No lessons yet"
            }

        # Fetch completed lessons for this student
        completed_lesson_ids = set(
            Progress.objects.filter(
                student=student,
                lesson__in=all_lessons,
                completed=True
            ).values_list("lesson_id", flat=True)
        )

        completed_count = len(completed_lesson_ids)
        percent = int(round((completed_count / total_lessons) * 100))

        # Find first incomplete lesson, or fallback to the last lesson if course is fully completed
        current_lesson = None
        for l in all_lessons:
            if l.id not in completed_lesson_ids:
                current_lesson = l
                break
        if not current_lesson and all_lessons:
            current_lesson = all_lessons[-1]

        current_module = current_lesson.module if current_lesson else None

        current_module_number = 1
        for idx, m in enumerate(modules):
            if current_module and m.id == current_module.id:
                current_module_number = idx + 1
                break

        total_modules = len(modules)
        current_module_title = current_module.title if current_module else ""

        current_lesson_number = 1
        current_module_lessons = module_lessons_map.get(current_module.id, []) if current_module else []
        for idx, l in enumerate(current_module_lessons):
            if l.id == current_lesson.id:
                current_lesson_number = idx + 1
                break

        total_module_lessons = len(current_module_lessons)
        current_lesson_title = current_lesson.title if current_lesson else ""

        return {
            "percent": percent,
            "completed_count": completed_count,
            "total_count": total_lessons,
            "current_module_number": current_module_number,
            "total_modules": total_modules,
            "current_module_title": current_module_title,
            "current_lesson_number": current_lesson_number,
            "total_module_lessons": total_module_lessons,
            "current_lesson_title": current_lesson_title
        }
        
class ProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Progress
        fields = "__all__"
        read_only_fields = ["student"]

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = "__all__"


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = "__all__"

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = "__all__"
        read_only_fields = ["student", "approved", "created_at"]

class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = "__all__"
        read_only_fields = ["student", "certificate_id", "issued_at"]

class QuizSubmissionSerializer(serializers.Serializer):
    answers = serializers.DictField(
        child=serializers.IntegerField()
    )

class ReviewReportSerializer(serializers.ModelSerializer):
    reported_by_username = serializers.ReadOnlyField(source='reported_by.username')
    review_comment = serializers.ReadOnlyField(source='review.comment')
    course_title = serializers.ReadOnlyField(source='review.course.title')
    student_email = serializers.ReadOnlyField(source='review.student.email')

    class Meta:
        model = ReviewReport
        fields = "__all__"
        read_only_fields = ["reported_by", "created_at", "reviewed_at", "status"]