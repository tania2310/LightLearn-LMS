from django.contrib import admin
from .models import ChatRoom, ChatMessage

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ("id", "course", "is_locked", "created_at")
    list_filter = ("is_locked", "created_at")
    search_fields = ("course__title",)

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "sender", "message_snippet", "is_pinned", "is_deleted", "is_read", "created_at")
    list_filter = ("is_pinned", "is_deleted", "is_read", "deleted_by_role", "created_at")
    search_fields = ("sender__username", "message")

    def message_snippet(self, obj):
        return obj.message[:50] if obj.message else ""
