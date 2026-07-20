import json
import logging
import time
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from django.utils import timezone
from courses.models import Course
from .models import ChatRoom, ChatMessage
from .permissions import has_chat_access

logger = logging.getLogger(__name__)

@database_sync_to_async
def send_chat_notification(recipient, title, message, course_id):
    from notifications.models import Notification
    try:
        Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type="QA",
            target_url=f"/qa/{course_id}"
        )
    except Exception as e:
        logger.error(f"Error creating notification: {e}")

class CourseChatConsumer(AsyncWebsocketConsumer):
    @database_sync_to_async
    def verify_chat_access(self, user, course_id):
        try:
            course = Course.objects.get(id=course_id)
            return has_chat_access(user, course)
        except Course.DoesNotExist:
            return False

    @database_sync_to_async
    def get_room_lock_status(self, course_id):
        try:
            course = Course.objects.get(id=course_id)
            room, _ = ChatRoom.objects.get_or_create(course=course)
            return room.is_locked
        except Course.DoesNotExist:
            return False

    @database_sync_to_async
    def toggle_room_lock(self, user, course_id):
        if not (user.is_staff or user.role in ["admin", "mentor"]):
            return False, False
        try:
            course = Course.objects.get(id=course_id)
            room, _ = ChatRoom.objects.get_or_create(course=course)
            room.is_locked = not room.is_locked
            room.save()
            return True, room.is_locked
        except Course.DoesNotExist:
            return False, False

    @database_sync_to_async
    def save_chat_message(self, user, course_id, message_text, parent_id=None, attachment_url=None):
        course = Course.objects.get(id=course_id)
        room, _ = ChatRoom.objects.get_or_create(course=course)
        parent_msg = None
        if parent_id:
            try:
                parent_msg = ChatMessage.objects.get(id=parent_id, room=room)
                if parent_msg.parent_id is not None or parent_msg.parent is not None:
                    return None, "Replies can only be added to top-level messages."
                # Send notification to parent message author if different user
                if parent_msg.sender != user:
                    send_chat_notification(
                        recipient=parent_msg.sender,
                        title=f"New reply from {user.username}",
                        message=f"{user.username} replied to your message in {course.title}",
                        course_id=course_id
                    )
            except ChatMessage.DoesNotExist:
                return None, "Target message does not exist."
                
        msg = ChatMessage.objects.create(
            room=room,
            sender=user,
            parent=parent_msg,
            message=message_text,
            message_type="text"
        )
        return msg.id, msg.created_at.isoformat()

    @database_sync_to_async
    def mark_messages_as_read(self, user, course_id):
        try:
            course = Course.objects.get(id=course_id)
            room, _ = ChatRoom.objects.get_or_create(course=course)
            ChatMessage.objects.filter(room=room, is_read=False).exclude(sender=user).update(
                is_read=True,
                read_at=timezone.now()
            )
            return True
        except Exception:
            return False

    @database_sync_to_async
    def soft_delete_chat_message(self, user, message_id):
        try:
            msg = ChatMessage.objects.get(id=message_id)
            if user.is_staff or user.role in ["admin", "mentor"] or msg.sender == user:
                msg.is_deleted = True
                msg.deleted_by_role = user.role
                msg.save()
                return True, msg.deleted_by_role
        except ChatMessage.DoesNotExist:
            pass
        return False, None

    @database_sync_to_async
    def edit_chat_message(self, user, message_id, new_text):
        try:
            msg = ChatMessage.objects.get(id=message_id)
            if user.is_staff or user.role in ["admin", "mentor"] or msg.sender == user:
                msg.message = new_text
                msg.edited_at = timezone.now()
                msg.save()
                return True, msg.edited_at.isoformat()
        except ChatMessage.DoesNotExist:
            pass
        return False, None

    @database_sync_to_async
    def pin_chat_message(self, user, message_id):
        try:
            msg = ChatMessage.objects.get(id=message_id)
            if user.is_staff or user.role in ["admin", "mentor"]:
                msg.is_pinned = not msg.is_pinned
                msg.save()
                return True, msg.is_pinned
        except ChatMessage.DoesNotExist:
            pass
        return False, False

    # Presence Cache Helpers
    def add_user_presence(self, course_id, user):
        key = f"chat_presence_set_{course_id}"
        presence = cache.get(key, {})
        presence[user.id] = {
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
            "joined_at": timezone.now().isoformat()
        }
        cache.set(key, presence, timeout=86400)
        return list(presence.values())

    def remove_user_presence(self, course_id, user_id):
        key = f"chat_presence_set_{course_id}"
        presence = cache.get(key, {})
        if user_id in presence:
            del presence[user_id]
            cache.set(key, presence, timeout=86400)
        return list(presence.values())

    # Rate Limit Helper
    def check_rate_limit(self, user_id, course_id):
        key = f"user_msg_times_{course_id}_{user_id}"
        times = cache.get(key, [])
        now = time.time()
        times = [t for t in times if now - t < 10]
        if len(times) >= 5:
            return False
        times.append(now)
        cache.set(key, times, timeout=15)
        return True

    async def connect(self):
        self.course_id = self.scope["url_route"]["kwargs"]["course_id"]
        self.room_group_name = f"course_chat_{self.course_id}"
        user = self.scope.get("user")

        if not user or not user.is_authenticated:
            logger.warning(f"Anonymous connection rejected for course chat room: {self.course_id}")
            await self.close()
            return

        has_access = await self.verify_chat_access(user, self.course_id)
        if not has_access:
            logger.warning(f"User {user.username} rejected due to lack of course chat permissions for room: {self.course_id}")
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        online_users = self.add_user_presence(self.course_id, user)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "presence_update",
                "online_users": online_users
            }
        )
        logger.info(f"User {user.username} ({user.role}) connected to course chat room: {self.course_id}")

    async def disconnect(self, close_code):
        user = self.scope.get("user")
        username = user.username if user and user.is_authenticated else "Anonymous"
        
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        if user and user.is_authenticated:
            online_users = self.remove_user_presence(self.course_id, user.id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "presence_update",
                    "online_users": online_users
                }
            )
        logger.info(f"User {username} disconnected from course chat room: {self.course_id} (code: {close_code})")

    async def receive(self, text_data):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return

        if text_data.strip() == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            logger.warning(f"Malformed JSON received from user {user.username} in room {self.course_id}")
            await self.send(text_data=json.dumps({"error": "Invalid message"}))
            return

        event_type = data.get("type")

        # Mark read event
        if event_type == "mark_read":
            success = await self.mark_messages_as_read(user, self.course_id)
            if success:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "read_receipt",
                        "read_by": user.id
                    }
                )
            return

        # Typing indicator event
        if event_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_typing",
                    "user_id": user.id,
                    "username": user.username,
                    "is_typing": data.get("is_typing", True)
                }
            )
            return

        # Mute User event
        if event_type == "mute_user":
            if user.is_staff or user.role in ["admin", "mentor"]:
                target_user_id = data.get("user_id")
                duration = data.get("duration_minutes", 15)
                cache.set(f"chat_muted_{self.course_id}_{target_user_id}", True, timeout=duration * 60)
                await self.send(text_data=json.dumps({"status": "User muted successfully"}))
            return

        # Toggle Lock Room event
        if event_type == "toggle_lock":
            success, is_locked = await self.toggle_room_lock(user, self.course_id)
            if success:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "room_locked",
                        "is_locked": is_locked,
                        "locked_by": user.username
                    }
                )
            return

        # Delete event
        if event_type == "delete_message":
            msg_id = data.get("message_id")
            success, deleted_by_role = await self.soft_delete_chat_message(user, msg_id)
            if success:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message_deleted",
                        "id": msg_id,
                        "deleted_by_role": deleted_by_role
                    }
                )
            return

        # Edit event
        if event_type == "edit_message":
            msg_id = data.get("message_id")
            new_text = data.get("message")
            success, edited_at = await self.edit_chat_message(user, msg_id, new_text)
            if success:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message_edited",
                        "id": msg_id,
                        "message": new_text,
                        "edited_at": edited_at
                    }
                )
            return

        # Pin event
        if event_type == "pin_message":
            msg_id = data.get("message_id")
            success, is_pinned = await self.pin_chat_message(user, msg_id)
            if success:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message_pinned",
                        "id": msg_id,
                        "is_pinned": is_pinned
                    }
                )
            return

        # Check Muted status
        if cache.get(f"chat_muted_{self.course_id}_{user.id}"):
            await self.send(text_data=json.dumps({"error": "You are currently muted in this chat room."}))
            return

        # Check Room Locked status (Student Lock Rule: mentors/admins bypass)
        is_locked = await self.get_room_lock_status(self.course_id)
        if is_locked and user.role == "student":
            await self.send(text_data=json.dumps({"error": "This chat room has been locked by a mentor."}))
            return

        # WebSocket Rate Limiting (Students only)
        if user.role == "student":
            if not self.check_rate_limit(user.id, self.course_id):
                await self.send(text_data=json.dumps({"error": "You are sending messages too fast. Please wait a moment."}))
                return

        # Standard new message / threaded reply
        message = data.get("message")
        if not message:
            logger.warning(f"Received message with missing message field from user {user.username} in room {self.course_id}")
            await self.send(text_data=json.dumps({"error": "Invalid message"}))
            return

        client_id = data.get("client_id")
        parent_id = data.get("parent_id") if data.get("parent_id") is not None else data.get("parent")
        attachment_url = data.get("attachment_url")

        msg_id, timestamp_or_error = await self.save_chat_message(user, self.course_id, message, parent_id, attachment_url)
        if msg_id is None:
            await self.send(text_data=json.dumps({"error": timestamp_or_error}))
            return

        logger.info(f"Saved message id {msg_id} from {user.username} in room {self.course_id}")

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "id": msg_id,
                "client_id": client_id,
                "user_id": user.id,
                "username": user.username,
                "role": user.role,
                "parent_id": parent_id,
                "parent": parent_id,
                "message": message,
                "attachment_url": attachment_url,
                "is_pinned": False,
                "is_read": False,
                "timestamp": timestamp_or_error
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            "id": event["id"],
            "client_id": event["client_id"],
            "user_id": event["user_id"],
            "username": event["username"],
            "role": event["role"],
            "parent_id": event.get("parent_id"),
            "parent": event.get("parent"),
            "message": event["message"],
            "attachment_url": event.get("attachment_url"),
            "is_pinned": event.get("is_pinned", False),
            "is_read": event.get("is_read", False),
            "timestamp": event["timestamp"]
        }))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            "type": "read_receipt",
            "read_by": event["read_by"]
        }))

    async def chat_typing(self, event):
        await self.send(text_data=json.dumps({
            "type": "typing",
            "user_id": event["user_id"],
            "username": event["username"],
            "is_typing": event["is_typing"]
        }))

    async def chat_message_deleted(self, event):
        deleted_text = "This message was removed by a mentor." if event.get("deleted_by_role") in ["mentor", "admin"] else "This message was deleted."
        await self.send(text_data=json.dumps({
            "type": "message_deleted",
            "id": event["id"],
            "message": deleted_text
        }))

    async def chat_message_edited(self, event):
        await self.send(text_data=json.dumps({
            "type": "message_edited",
            "id": event["id"],
            "message": event["message"],
            "edited_at": event["edited_at"]
        }))

    async def chat_message_pinned(self, event):
        await self.send(text_data=json.dumps({
            "type": "message_pinned",
            "id": event["id"],
            "is_pinned": event["is_pinned"]
        }))

    async def presence_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "presence_update",
            "online_users": event["online_users"]
        }))

    async def room_locked(self, event):
        await self.send(text_data=json.dumps({
            "type": "room_locked",
            "is_locked": event["is_locked"],
            "locked_by": event["locked_by"]
        }))
