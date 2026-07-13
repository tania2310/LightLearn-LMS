from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ChatRoomViewSet,
    ChatMessageViewSet,
    DeleteMessageView,
    ChatHistoryView,
)

router = DefaultRouter()
router.register(r"chatrooms", ChatRoomViewSet)
router.register(r"messages", ChatMessageViewSet)

urlpatterns = router.urls + [
    path(
        "messages/<int:message_id>/delete/",
        DeleteMessageView.as_view(),
        name="delete-message",
    ),
    path(
        "chatrooms/<int:room_id>/history/",
        ChatHistoryView.as_view(),
        name="chat-history",
    ),
]