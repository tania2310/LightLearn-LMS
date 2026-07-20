from rest_framework import serializers
from .models import ChatMessage

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    username = serializers.CharField(source="sender.username", read_only=True)
    role = serializers.CharField(source="sender.role", read_only=True)
    message = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "sender_id",
            "username",
            "role",
            "parent_id",
            "message",
            "attachment_url",
            "is_pinned",
            "is_read",
            "read_at",
            "created_at",
            "edited_at",
            "is_deleted",
            "deleted_by_role",
            "replies",
        ]
        read_only_fields = ["id", "created_at"]

    def get_message(self, obj):
        if obj.is_deleted:
            if obj.deleted_by_role in ["mentor", "admin"]:
                return "This message was removed by a mentor."
            return "This message was deleted."
        return obj.message

    def get_attachment_url(self, obj):
        if obj.attachment and hasattr(obj.attachment, "url"):
            return obj.attachment.url
        return None

    def get_replies(self, obj):
        if obj.parent_id is None:
            child_replies = obj.replies.all().order_by("created_at")
            return ChatMessageSerializer(child_replies, many=True).data
        return []
