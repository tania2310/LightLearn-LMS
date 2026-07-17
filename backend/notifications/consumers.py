import json
import logging
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        # Check query string for token if standard session user is anonymous
        if user is None or not user.is_authenticated:
            query_string = self.scope.get("query_string", b"").decode("utf-8")
            query_params = parse_qs(query_string)
            token = query_params.get("token", [None])[0]
            if token:
                try:
                    from rest_framework_simplejwt.tokens import AccessToken
                    validated_token = AccessToken(token)
                    user_id = validated_token.payload.get("user_id")
                    if user_id:
                        db_user = await self.get_user(user_id)
                        if db_user:
                            user = db_user
                except Exception as e:
                    logger.warning(f"WebSocket token validation failed: {e}")

        if user is None or not user.is_authenticated:
            await self.close()
            return

        self.user = user
        self.group_name = f"notifications_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_notification(self, event):
        # Relay message event to WebSocket client
        await self.send(text_data=json.dumps(event["data"]))

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
