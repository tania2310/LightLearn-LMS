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
        serializer.save(sender=self.request.user)

class DeleteMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, message_id):
        try:
            message = ChatMessage.objects.get(id=message_id)
        except ChatMessage.DoesNotExist:
            return Response(
                {"error": "Message not found"},
                status=404
            )

        # Admin or sender can delete
        if request.user != message.sender and not request.user.is_staff:
            return Response(
                {"error": "Permission denied"},
                status=403
            )

        message.delete()

        return Response({"message": "Deleted successfully"})

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