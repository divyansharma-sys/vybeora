from django.urls import re_path
from .consumers import RoomConsumer

websocket_urlpatterns = [
    re_path(r"^ws/rooms/(?P<room_code>[0-9a-zA-Z_-]+)/$", RoomConsumer.as_asgi()),
]
