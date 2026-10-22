from rest_framework import serializers
from apps.movies.serializers import MovieSerializer
from .models import Room, RoomParticipant, RoomVideoUpload, RoomWatchlistItem, RoomWatchlistVote


class RoomParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomParticipant
        fields = ["id", "username", "role", "is_active", "joined_at"]


class RoomVideoUploadSerializer(serializers.ModelSerializer):
    playback_url = serializers.SerializerMethodField()

    class Meta:
        model = RoomVideoUpload
        fields = [
            "id",
            "title",
            "original_filename",
            "playback_url",
            "file_size_bytes",
            "content_type",
            "uploaded_by",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "playback_url", "file_size_bytes", "content_type", "status", "created_at"]

    def get_playback_url(self, obj):
        if obj.video_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        return ""


class RoomWatchlistItemSerializer(serializers.ModelSerializer):
    movie_details = MovieSerializer(source="movie", read_only=True)
    vote_count = serializers.IntegerField(read_only=True)
    voters = serializers.SerializerMethodField()

    class Meta:
        model = RoomWatchlistItem
        fields = [
            "id",
            "movie",
            "movie_details",
            "suggested_by",
            "vote_count",
            "voters",
            "created_at",
        ]

    def get_voters(self, obj):
        return list(obj.votes.values_list("username", flat=True))


class RoomSerializer(serializers.ModelSerializer):
    participant_count = serializers.IntegerField(read_only=True)
    participants = RoomParticipantSerializer(many=True, read_only=True)
    movie_details = MovieSerializer(source="movie", read_only=True)
    uploaded_videos = RoomVideoUploadSerializer(many=True, read_only=True)
    watchlist_items = RoomWatchlistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "code",
            "title",
            "host_name",
            "movie",
            "movie_details",
            "movie_title",
            "genre",
            "current_time_seconds",
            "is_playing",
            "playback_rate",
            "last_updated_at",
            "is_private",
            "max_participants",
            "status",
            "participant_count",
            "participants",
            "uploaded_videos",
            "watchlist_items",
            "created_at",
        ]


class RoomCreateSerializer(serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "code",
            "title",
            "host_name",
            "movie",
            "movie_title",
            "genre",
            "is_private",
            "passcode",
            "max_participants",
        ]


class MovieNightRatingSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import MovieNightRating
        model = MovieNightRating
        fields = ["id", "username", "rating", "review", "created_at"]


class MovieNightSessionSerializer(serializers.ModelSerializer):
    ratings = MovieNightRatingSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()

    class Meta:
        from .models import MovieNightSession
        model = MovieNightSession
        fields = [
            "id",
            "room_code",
            "title",
            "movie_title",
            "movie_poster",
            "host_username",
            "participants",
            "total_messages_count",
            "vibe_tag",
            "notes",
            "watched_at",
            "ratings",
            "average_rating",
        ]

    def get_average_rating(self, obj):
        ratings = obj.ratings.all()
        if not ratings.exists():
            return None
        return round(sum(r.rating for r in ratings) / ratings.count(), 1)

