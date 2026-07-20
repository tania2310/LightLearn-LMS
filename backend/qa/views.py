from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Question, Answer
from .serializers import QuestionSerializer, AnswerSerializer


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "student":
            from courses.models import Enrollment
            return Question.objects.filter(course__enrollments__student=user, course__enrollments__status="approved")
        elif user.role == "mentor":
            return Question.objects.filter(course__mentor=user)
        return Question.objects.all()

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "student":
            from courses.models import Enrollment
            return Answer.objects.filter(question__course__enrollments__student=user, question__course__enrollments__status="approved")
        elif user.role == "mentor":
            return Answer.objects.filter(question__course__mentor=user)
        return Answer.objects.all()

    def perform_create(self, serializer):
        answer = serializer.save(mentor=self.request.user)
        try:
            from notifications.services import send_qa_answered_notification
            send_qa_answered_notification(answer.question)
        except Exception as e:
            pass


from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.throttling import UserRateThrottle
from courses.models import Lesson, Enrollment
from .models import AIConversation, AIMessage
from .serializers import AIConversationSerializer, AIMessageSerializer
from .services import generate_ai_response

class AIConversationViewSet(viewsets.ModelViewSet):
    serializer_class = AIConversationSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]

    def get_queryset(self):
        user = self.request.user
        if user.role != "student":
            return AIConversation.objects.none()
        return AIConversation.objects.filter(student=user)

    def list(self, request, *args, **kwargs):
        user = request.user
        if user.role != "student":
            raise PermissionDenied("Only students may access the Q&A Assistant.")

        lesson_id = request.query_params.get("lesson")
        if not lesson_id:
            raise ValidationError({"lesson": "This parameter is required."})

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            raise ValidationError({"lesson": "Lesson not found."})

        # Validate enrollment
        if not Enrollment.objects.filter(student=user, course=lesson.module.course, status="approved").exists():
            raise PermissionDenied("You must be enrolled in this course to access the Q&A Assistant.")

        conversation, created = AIConversation.objects.get_or_create(
            student=user,
            lesson=lesson
        )
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        user = request.user
        if user.role != "student":
            raise PermissionDenied("Only students may access the Q&A Assistant.")

        lesson_id = request.data.get("lesson")
        question = request.data.get("question")

        if not lesson_id or not question:
            raise ValidationError({"detail": "Both lesson and question fields are required."})

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            raise ValidationError({"detail": "Lesson not found."})

        # Validate enrollment
        if not Enrollment.objects.filter(student=user, course=lesson.module.course, status="approved").exists():
            raise PermissionDenied("You must be enrolled in this course to access the Q&A Assistant.")

        # Get or create conversation
        conversation, created = AIConversation.objects.get_or_create(
            student=user,
            lesson=lesson
        )

        # Save student message
        AIMessage.objects.create(
            conversation=conversation,
            sender="user",
            message=question
        )

        # Generate AI reply (sending current history context)
        ai_reply, model, tokens = generate_ai_response(
            student=user,
            lesson=lesson,
            question=question,
            history_messages=conversation.messages.exclude(sender="user", message=question)
        )

        # Save assistant reply
        AIMessage.objects.create(
            conversation=conversation,
            sender="assistant",
            message=ai_reply,
            model_used=model,
            tokens_used=tokens
        )

        messages_serialized = AIMessageSerializer(conversation.messages.all(), many=True).data
        return Response({
            "conversation_id": conversation.id,
            "answer": ai_reply,
            "messages": messages_serialized
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"])
    def clear(self, request, pk=None):
        conversation = self.get_object()
        conversation.messages.all().delete()
        return Response({"status": "messages cleared"}, status=status.HTTP_200_OK)