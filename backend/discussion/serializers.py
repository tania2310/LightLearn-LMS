from rest_framework import serializers
from .models import ChatRoom, ChatMessage


class ChatRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatRoom
        fields = "__all__"


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(
        source="sender.username",
        read_only=True
    )

    replies = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "room",
            "sender",
            "sender_name",
            "message",
            "parent",
            "reply_count",
            "replies",
            "created_at",
        ]
        read_only_fields = ["sender", "created_at"]

    def get_reply_count(self, obj):
        return obj.replies.count()

    def get_replies(self, obj):
        return ChatMessageSerializer(
            obj.replies.all(),
            many=True,
            context=self.context
        ).data