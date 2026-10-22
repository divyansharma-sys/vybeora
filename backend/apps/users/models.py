import uuid
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """
    Extends standard Django User with cinematic profile bio, avatar, and hangout metrics.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    display_name = models.CharField(max_length=150, blank=True)
    bio = models.TextField(blank=True, default="Movie enthusiast on Vybeora.")
    avatar_url = models.URLField(max_length=500, blank=True)
    parties_attended = models.IntegerField(default=0)
    rooms_hosted = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(
            user=instance,
            display_name=f"{instance.first_name} {instance.last_name}".strip() or instance.username
        )
    else:
        if hasattr(instance, "profile"):
            instance.profile.save()


class Friendship(models.Model):
    """
    Directional friend relationship and request between two registered users.
    Status: 'pending', 'accepted', 'declined'
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_friendships")
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_friendships")
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("accepted", "Accepted"), ("declined", "Declined")],
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ("requester", "receiver")

    def __str__(self):
        return f"{self.requester.username} -> {self.receiver.username} ({self.status})"


class RoomInvitation(models.Model):
    """
    Direct room invite sent from a host/participant to a registered friend.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room_code = models.CharField(max_length=50)
    room_title = models.CharField(max_length=255)
    movie_title = models.CharField(max_length=255, blank=True)
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_room_invitations")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_room_invitations")
    status = models.CharField(
        max_length=20,
        choices=[("pending", "Pending"), ("accepted", "Accepted"), ("declined", "Declined")],
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Invite to #{self.room_code} for {self.recipient.username}"

