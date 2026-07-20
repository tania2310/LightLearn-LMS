from django.contrib import admin
from .models import Question, Answer, AIConversation, AIMessage

# Register your models here.

@admin.register(AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "lesson", "created_at", "updated_at")
    readonly_fields = ("created_at", "updated_at")

@admin.register(AIMessage)
class AIMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at")
    readonly_fields = ("created_at",)
