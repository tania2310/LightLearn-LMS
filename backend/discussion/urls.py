from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ChatRoomViewSet,
    ChatMessageViewSet,
    DeleteMessageView,
    ChatHistoryView,
    LockRoomView,
    UnlockRoomView,
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
    path(
        "chatrooms/<int:room_id>/lock/",
        LockRoomView.as_view(),
        name="lock-room",
    ),
    path(
        "chatrooms/<int:room_id>/unlock/",
        UnlockRoomView.as_view(),
        name="unlock-room",
    ),
]