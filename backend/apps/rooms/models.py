import uuid
from django.db import models
from apps.movies.models import Movie


class Room(models.Model):
    """
    Virtual Cinema Watch Room with Synchronized Playback State.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    host_name = models.CharField(max_length=150, default="Host")
    movie = models.ForeignKey(Movie, on_delete=models.SET_NULL, null=True, blank=True, related_name="rooms")
    movie_title = models.CharField(max_length=255, blank=True)
    genre = models.CharField(max_length=100, default="General")
    
    # Playback synchronization fields
    current_time_seconds = models.FloatField(default=0.0)
    is_playing = models.BooleanField(default=True)
    playback_rate = models.FloatField(default=1.0)
    last_updated_at = models.DateTimeField(auto_now=True)

    is_private = models.BooleanField(default=True)
    passcode = models.CharField(max_length=100, blank=True)
    max_participants = models.IntegerField(default=8)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("lobby", "Lobby"), ("closed", "Closed")],
        default="active",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} (#{self.code})"

    @property
    def participant_count(self):
        return self.participants.filter(is_active=True).count()


class RoomParticipant(models.Model):
    """
    Participant in an active watch room.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="participants")
    username = models.CharField(max_length=150)
    role = models.CharField(max_length=20, default="Viewer")
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("room", "username")

    def __str__(self):
        return f"{self.username} in {self.room.code}"


def room_video_upload_path(instance, filename):
    return f"room_videos/{instance.room.code}/{uuid.uuid4().hex[:8]}_{filename}"


class RoomVideoUpload(models.Model):
    """
    User uploaded video for a watch party room.
    Stores metadata, processed state, and direct playback path.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="uploaded_videos")
    title = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    video_file = models.FileField(upload_to=room_video_upload_path)
    file_size_bytes = models.BigIntegerField(default=0)
    content_type = models.CharField(max_length=100, default="video/mp4")
    uploaded_by = models.CharField(max_length=150, default="Host")
    status = models.CharField(
        max_length=20,
        choices=[("ready", "Ready"), ("processing", "Processing"), ("failed", "Failed")],
        default="ready",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.room.code})"


class RoomWatchlistItem(models.Model):
    """
    Movie suggested by a room participant for the shared watch party watchlist.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="watchlist_items")
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name="watchlist_entries")
    suggested_by = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("room", "movie")

    def __str__(self):
        return f"{self.movie.title} in #{self.room.code}"

    @property
    def vote_count(self):
        return self.votes.count()


class RoomWatchlistVote(models.Model):
    """
    Vote cast by a participant for a suggested watchlist movie.
    A user can vote for one movie at a time per room (one vote per user per room constraint).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="watchlist_votes")
    item = models.ForeignKey(RoomWatchlistItem, on_delete=models.CASCADE, related_name="votes")
    username = models.CharField(max_length=150)
    voted_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("room", "username")

class MovieNightSession(models.Model):
    """
    Archived movie night memory created when a party concludes or is saved by the host.
    Stores participant list, movie watched, date, and overall group vibe.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room_code = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    movie_title = models.CharField(max_length=255)
    movie_poster = models.URLField(max_length=500, blank=True)
    host_username = models.CharField(max_length=150)
    participants = models.JSONField(default=list)
    total_messages_count = models.IntegerField(default=0)
    vibe_tag = models.CharField(max_length=100, default="Epic Movie Night")
    notes = models.TextField(blank=True)
    watched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-watched_at"]

    def __str__(self):
        return f"{self.title} - {self.movie_title} ({self.watched_at.strftime('%Y-%m-%d')})"


class MovieNightRating(models.Model):
    """
    Participant ratings (1-5 stars) and reviews for a movie night session.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(MovieNightSession, on_delete=models.CASCADE, related_name="ratings")
    username = models.CharField(max_length=150)
    rating = models.IntegerField(default=5)  # 1 to 5
    review = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("session", "username")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.username} rated {self.session.movie_title}: {self.rating}★"


