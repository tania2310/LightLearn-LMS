import csv
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone

from courses.models import Course
from .models import ChatRoom, ChatMessage
from .serializers import ChatMessageSerializer
from .permissions import has_chat_access

class ChatHistoryView(ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        course_id = self.kwargs.get("course_id")
        course = get_object_or_404(Course, id=course_id)
        if not has_chat_access(request.user, course):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        course_id = self.kwargs.get("course_id")
        course = get_object_or_404(Course, id=course_id)
        room, _ = ChatRoom.objects.get_or_create(course=course)
        return ChatMessage.objects.filter(room=room).order_by("created_at")


ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        if not has_chat_access(request.user, course):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        # Max file size 10MB
        if file_obj.size > 10 * 1024 * 1024:
            return Response({"error": "File size exceeds 10 MB limit"}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj.content_type not in ALLOWED_MIME_TYPES:
            return Response({"error": f"Invalid file type: {file_obj.content_type}"}, status=status.HTTP_400_BAD_REQUEST)

        room, _ = ChatRoom.objects.get_or_create(course=course)
        msg = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            message=file_obj.name,
            attachment=file_obj,
            message_type="text"
        )

        return Response({
            "id": msg.id,
            "filename": file_obj.name,
            "attachment_url": msg.attachment.url if msg.attachment else ""
        }, status=status.HTTP_201_CREATED)


class ChatStatisticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        if not has_chat_access(request.user, course):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        room, _ = ChatRoom.objects.get_or_create(course=course)
        messages_qs = ChatMessage.objects.filter(room=room)

        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))

        total_messages = messages_qs.count()
        participants = messages_qs.values("sender").distinct().count()
        attachments = messages_qs.exclude(attachment="").exclude(attachment__isnull=True).count()
        pinned_messages = messages_qs.filter(is_pinned=True, is_deleted=False).count()
        deleted_messages = messages_qs.filter(is_deleted=True).count()
        today_messages = messages_qs.filter(created_at__gte=today_start).count()

        return Response({
            "total_messages": total_messages,
            "participants": participants,
            "attachments": attachments,
            "pinned_messages": pinned_messages,
            "deleted_messages": deleted_messages,
            "today_messages": today_messages
        })


class ChatExportCSVView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        user = request.user
        
        # Only mentors and admins can export
        if not (user.is_staff or user.role in ["admin", "mentor"] or course.instructor == user):
            return Response({"error": "Only course mentors and admins can export chat history."}, status=status.HTTP_403_FORBIDDEN)

        room, _ = ChatRoom.objects.get_or_create(course=course)
        messages_qs = ChatMessage.objects.filter(room=room).order_by("created_at")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="chat_history_course_{course_id}.csv"'

        writer = csv.writer(response)
        writer.writerow(["Message ID", "Timestamp", "Username", "Role", "Message", "Is Pinned", "Is Deleted", "Attachment URL"])

        for m in messages_qs:
            msg_text = "This message was deleted." if m.is_deleted else m.message
            att_url = m.attachment.url if m.attachment and hasattr(m.attachment, "url") else ""
            writer.writerow([
                m.id,
                m.created_at.isoformat(),
                m.sender.username,
                m.sender.role,
                msg_text,
                m.is_pinned,
                m.is_deleted,
                att_url
            ])

        return response
