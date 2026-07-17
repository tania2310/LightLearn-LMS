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

    class Meta:
        model = Enrollment
        fields = "__all__"
        read_only_fields = ["student"]
        
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