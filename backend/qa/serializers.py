from rest_framework import serializers
from .models import Question, Answer


class AnswerSerializer(serializers.ModelSerializer):
    mentor_username = serializers.CharField(source="mentor.username", read_only=True)

    class Meta:
        model = Answer
        fields = "__all__"
        read_only_fields = ["mentor"]


class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)

    class Meta:
        model = Question
        fields = "__all__"
        read_only_fields = ["student"]