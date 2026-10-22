from django.urls import re_path

# WebSocket URL patterns for live chat and emoji reactions
websocket_urlpatterns = [
    # Will be connected to ChatConsumer in Phase 5
    # re_path(r"^ws/chat/(?P<room_code>[0-9a-zA-Z_-]+)/$", ChatConsumer.as_asgi()),
]
