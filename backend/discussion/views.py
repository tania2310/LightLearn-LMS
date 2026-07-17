from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView


from .models import ChatRoom, ChatMessage
from .serializers import (
    ChatRoomSerializer,
    ChatMessageSerializer,
)


class ChatRoomViewSet(viewsets.ModelViewSet):
    queryset = ChatRoom.objects.all()
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]


class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatMessage.objects.filter(parent=None).order_by("created_at")

    def perform_create(self, serializer):
        room_id = self.request.data.get("room")
        try:
            room = ChatRoom.objects.get(id=room_id)
            if room.is_locked:
                is_admin = self.request.user.role == "admin" or self.request.user.is_staff
                is_mentor = self.request.user == room.course.mentor
                if not (is_admin or is_mentor):
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("This chat room is locked.")
        except ChatRoom.DoesNotExist:
            pass

        serializer.save(sender=self.request.user)

class DeleteMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete_message_logic(self, request, message_id):
        try:
            message = ChatMessage.objects.get(id=message_id)
        except ChatMessage.DoesNotExist:
            return Response(
                {"error": "Message not found"},
                status=404
            )

        is_sender = request.user == message.sender
        is_admin = request.user.role == "admin" or request.user.is_staff
        is_mentor = request.user == message.room.course.mentor

        if not (is_sender or is_admin or is_mentor):
            return Response(
                {"error": "Permission denied"},
                status=403
            )

        message.delete()
        return Response({"message": "Deleted successfully"})

    def delete(self, request, message_id):
        return self.delete_message_logic(request, message_id)

    def post(self, request, message_id):
        return self.delete_message_logic(request, message_id)

class LockRoomView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return Response({"error": "Chat room not found"}, status=404)

        is_admin = request.user.role == "admin" or request.user.is_staff
        is_mentor = request.user == room.course.mentor

        if not (is_admin or is_mentor):
            return Response({"error": "Permission denied"}, status=403)

        from django.utils import timezone
        room.is_locked = True
        room.locked_at = timezone.now()
        room.locked_by = request.user
        room.save()

        return Response({"message": "Chat room locked successfully.", "is_locked": True})

class UnlockRoomView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return Response({"error": "Chat room not found"}, status=404)

        is_admin = request.user.role == "admin" or request.user.is_staff
        is_mentor = request.user == room.course.mentor

        if not (is_admin or is_mentor):
            return Response({"error": "Permission denied"}, status=403)

        room.is_locked = False
        room.locked_at = None
        room.locked_by = None
        room.save()

        return Response({"message": "Chat room unlocked successfully.", "is_locked": False})

class ChatHistoryView(ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs["room_id"]

        return (
            ChatMessage.objects.filter(room_id=room_id, parent=None)
            .select_related("sender")
            .prefetch_related("replies")
            .order_by("created_at")
        )