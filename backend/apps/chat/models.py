import uuid
from django.db import models
from apps.rooms.models import Room


class ChatMessage(models.Model):
    """
    Real-time room chat message and reactions log.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="messages")
    user = models.CharField(max_length=150)
    is_host = models.BooleanField(default=False)
    text = models.TextField()
    is_spoiler = models.BooleanField(default=False)
    timestamp_tag = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.room.code}] {self.user}: {self.text[:30]}"
