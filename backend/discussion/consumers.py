import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatMessage, ChatRoom
from courses.models import Course
from accounts.models import User
from django.utils import timezone
from datetime import datetime
from courses.models import Enrollment


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.course_id = self.scope["url_route"]["kwargs"]["course_id"]
        self.room_group_name = f"course_{self.course_id}"

        user = self.scope["user"]

        if not user.is_authenticated:
            await self.close(code=4001)
            return

        enrolled = await self.is_enrolled(user)

        if not enrolled:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data["message"]
        parent_id = data.get("parent")

        user = self.scope["user"]

        if not user.is_authenticated:
            user = await database_sync_to_async(User.objects.first)()   

        # Lock check: restrict students if chat room is locked
        is_locked = await self.is_room_locked()
        if is_locked:
            is_admin = user.role == "admin" or user.is_staff
            is_mentor = await self.is_course_mentor(user)
            if not (is_admin or is_mentor):
                await self.send(text_data=json.dumps({
                    "error": "This chat room has been locked by a mentor."
                }))
                return

        await self.save_message(user, message, parent_id)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message,
                "username": user.username,
                "time": timezone.now().strftime("%H:%M"),
            },
        )

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "username": event["username"],
                    "message": event["message"],
                    "time": datetime.now().strftime("%H:%M"),
                }
            )
        )
    
    @database_sync_to_async
    def save_message(self, user, message, parent_id=None):
        course = Course.objects.get(id=self.course_id)

        room, created = ChatRoom.objects.get_or_create(course=course)
        parent = None

        if parent_id:
            parent = ChatMessage.objects.get(id=parent_id).first()
            
        ChatMessage.objects.create(
            room=room,
            sender=user,
            message=message,
            parent=parent,
        )   

    @database_sync_to_async
    def is_enrolled(self, user):
        if user.is_staff:
            return True

        # Check enrollment exists and is approved
        enrolled = Enrollment.objects.filter(
            student=user,
            course_id=self.course_id,
            status="approved"
        ).exists()
        if not enrolled:
            return False

        # Check if there is an approved refund
        from payments.models import RefundRequest
        has_refund = RefundRequest.objects.filter(
            student=user,
            enrollment__course_id=self.course_id,
            status="Approved"
        ).exists()
        if has_refund:
            return False

        return True

    @database_sync_to_async
    def is_room_locked(self):
        try:
            room = ChatRoom.objects.get(course_id=self.course_id)
            return room.is_locked
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def is_course_mentor(self, user):
        try:
            room = ChatRoom.objects.get(course_id=self.course_id)
            return room.course.mentor == user
        except ChatRoom.DoesNotExist:
            return False