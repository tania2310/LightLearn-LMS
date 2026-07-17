from rest_framework import serializers
from .models import RefundRequest, Payment

class RefundRequestSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)
    course_title = serializers.CharField(source="enrollment.course.title", read_only=True)
    course_id = serializers.IntegerField(source="enrollment.course.id", read_only=True)

    class Meta:
        model = RefundRequest
        fields = "__all__"
        read_only_fields = ["student", "requested_at", "reviewed_at"]

class PaymentSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source="student.username", read_only=True)
    course_title = serializers.CharField(source="enrollment.course.title", read_only=True)
    course_id = serializers.IntegerField(source="enrollment.course.id", read_only=True)

    class Meta:
        model = Payment
        fields = "__all__"
