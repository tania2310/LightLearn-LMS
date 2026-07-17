from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Question, Answer
from .serializers import QuestionSerializer, AnswerSerializer


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        answer = serializer.save(mentor=self.request.user)
        try:
            from notifications.services import send_qa_answered_notification
            send_qa_answered_notification(answer.question)
        except Exception as e:
            pass