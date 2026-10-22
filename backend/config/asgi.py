"""
ASGI config for Vybeora backend.
Exposes the ASGI callable as a module-level variable named ``application``.
Supports both standard HTTP traffic and WebSockets via Django Channels.
"""
import os
from django.core.asgi import get_asgi_application

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
import apps.rooms.routing
import apps.chat.routing

# Combine WebSocket routes across rooms and chat
websocket_patterns = (
    apps.rooms.routing.websocket_urlpatterns +
    apps.chat.routing.websocket_urlpatterns
)

application = ProtocolTypeRouter({
    # Standard Django HTTP request handler
    "http": django_asgi_app,

    # WebSocket protocol handler with host verification and auth middleware
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_patterns)
        )
    ),
})
