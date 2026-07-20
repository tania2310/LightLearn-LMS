import chat.routing
import discussion.routing
import notifications.routing

websocket_urlpatterns = (
    chat.routing.websocket_urlpatterns +
    discussion.routing.websocket_urlpatterns +
    notifications.routing.websocket_urlpatterns
)
