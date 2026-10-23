import random
import string
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.conf import settings
from .models import (
    Room,
    RoomParticipant,
    RoomVideoUpload,
    RoomWatchlistItem,
    RoomWatchlistVote,
    MovieNightSession,
    MovieNightRating,
)
from .serializers import (
    RoomSerializer,
    RoomCreateSerializer,
    RoomVideoUploadSerializer,
    RoomWatchlistItemSerializer,
    MovieNightSessionSerializer,
    MovieNightRatingSerializer,
)


class RoomListCreateView(generics.ListCreateAPIView):
    """
    Create a new private friends watch party room, or list rooms created by the current user.
    Public room discovery is completely removed: users cannot browse active rooms belonging to others.
    """
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return RoomCreateSerializer
        return RoomSerializer

    def get_queryset(self):
        # Strict privacy: Only return rooms created by the user requesting them
        user = self.request.user
        host_query = self.request.query_params.get("host", "").strip()

        if user.is_authenticated:
            user_names = [user.username]
            if hasattr(user, "profile") and user.profile.display_name:
                user_names.append(user.profile.display_name)
            if host_query:
                user_names.append(host_query)
            return Room.objects.filter(
                status__in=["active", "lobby"],
                host_name__in=user_names,
            )
        elif host_query:
            return Room.objects.filter(
                status__in=["active", "lobby"],
                host_name=host_query,
            )

        # Anonymous request without host identifier returns empty list
        return Room.objects.none()

    def perform_create(self, serializer):
        code = serializer.validated_data.get("code")
        if not code:
            # Generate unpredictable, secure room code
            import secrets
            token = secrets.token_hex(4)  # 8 hex characters: e.g. vybe-a9f2b84c
            code = f"vybe-{token}"
        room = serializer.save(code=code, is_private=True)
        # Add host as first registered participant
        RoomParticipant.objects.create(
            room=room,
            username=room.host_name or "Host",
            role="Host",
            is_active=True,
        )


class RoomDetailView(generics.RetrieveDestroyAPIView):
    """
    Retrieve or delete a room by room code.
    When deleted, notifies participants via WebSocket and removes any uploaded media files.
    """
    permission_classes = [AllowAny]
    serializer_class = RoomSerializer
    lookup_field = "code"

    def get_queryset(self):
        return Room.objects.all()

    def perform_destroy(self, instance):
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        import shutil
        import os
        from django.conf import settings

        room_code = instance.code

        # Notify any connected WebSocket clients that room is deleted/closed
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"room_{room_code}",
                {
                    "type": "room_closed_event",
                    "payload": {
                        "room_code": room_code,
                        "message": "This watch room has been closed by the host.",
                    },
                },
            )

        # Remove local disk video uploads for this room if any exist
        room_media_dir = os.path.join(settings.MEDIA_ROOT, "room_videos", room_code)
        if os.path.exists(room_media_dir):
            try:
                shutil.rmtree(room_media_dir)
            except Exception as e:
                pass

        instance.delete()


class RoomJoinView(APIView):
    """
    Join an active room with participant username.
    """
    permission_classes = [AllowAny]

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response(
                {"error": "Room not found or has been closed."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check passcode if private
        passcode = request.data.get("passcode", "")
        if room.is_private and room.passcode and room.passcode != passcode:
            return Response(
                {"error": "Invalid room passcode."},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = request.data.get("username", "Viewer").strip() or "Viewer"

        # Check room capacity
        if room.participant_count >= room.max_participants:
            return Response(
                {"error": "Room has reached its maximum viewer capacity."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participant, _ = RoomParticipant.objects.get_or_create(
            room=room,
            username=username,
            defaults={"role": "Viewer", "is_active": True},
        )
        if not participant.is_active:
            participant.is_active = True
            participant.save()

        return Response(RoomSerializer(room, context={"request": request}).data, status=status.HTTP_200_OK)


ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mkv", ".mov"}
ALLOWED_VIDEO_MIME_TYPES = {
    "video/mp4",
    "video/webm",
    "video/x-matroska",
    "video/quicktime",
    "application/octet-stream",  # some browsers send this for mp4/webm
}
MAX_FILE_SIZE = getattr(settings, "MAX_UPLOAD_SIZE_MB", 4096) * 1024 * 1024  # 4 GB movie upload limit


class RoomVideoUploadView(APIView):
    """
    Upload a local video file from user device to backend storage for the room.
    Validates file extension, MIME type, and maximum upload size.
    """
    permission_classes = [AllowAny]

    def post(self, request, code):
        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response(
                {"error": "Room not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        video_file = request.FILES.get("video_file")
        if not video_file:
            return Response(
                {"error": "No video file provided. Please attach a valid video file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. File size validation
        if video_file.size > MAX_FILE_SIZE:
            max_mb = MAX_FILE_SIZE // (1024 * 1024)
            return Response(
                {"error": f"Video file exceeds the maximum permitted size of {max_mb}MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Extension validation
        original_name = video_file.name
        ext = ""
        if "." in original_name:
            ext = "." + original_name.rsplit(".", 1)[-1].lower()

        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            return Response(
                {"error": f"Unsupported video format '{ext}'. Supported formats: MP4, WebM, MKV, MOV."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Content-Type check
        content_type = getattr(video_file, "content_type", "video/mp4")
        if content_type not in ALLOWED_VIDEO_MIME_TYPES and not content_type.startswith("video/"):
            return Response(
                {"error": f"Invalid content type '{content_type}'. Must be a video file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_by = request.data.get("uploaded_by") or (
            request.user.username if request.user.is_authenticated else "Host"
        )
        custom_title = request.data.get("title") or original_name

        upload_record = RoomVideoUpload.objects.create(
            room=room,
            title=custom_title,
            original_filename=original_name,
            video_file=video_file,
            file_size_bytes=video_file.size,
            content_type=content_type,
            uploaded_by=uploaded_by,
            status="ready",
        )

        serializer = RoomVideoUploadSerializer(upload_record, context={"request": request})
        return Response(
            {
                "message": "Video uploaded successfully and ready for watch party playback.",
                "video": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class RoomSelectVideoView(APIView):
    """
    Select active movie or uploaded video for the room and broadcast to all participants.
    """
    permission_classes = [AllowAny]

    def post(self, request, code):
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from apps.movies.models import Movie

        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response(
                {"error": "Room not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        source_type = request.data.get("source_type")  # "uploaded_video" | "catalog_movie" | "local_device"
        video_id = request.data.get("video_id")
        movie_id = request.data.get("movie_id")
        user = request.data.get("user", "Host")

        playback_payload = {
            "source_type": "direct_video",
            "source_url": "",
            "title": "",
            "is_local_device": False,
        }

        if source_type == "uploaded_video" and video_id:
            try:
                upload_record = RoomVideoUpload.objects.get(id=video_id, room=room)
                url = request.build_absolute_uri(upload_record.video_file.url)
                room.movie = None
                room.movie_title = upload_record.title
                room.current_time_seconds = 0.0
                room.is_playing = True
                room.save()

                playback_payload = {
                    "source_type": "direct_video",
                    "source_url": url,
                    "title": upload_record.title,
                    "video_id": str(upload_record.id),
                    "is_local_device": False,
                }
            except RoomVideoUpload.DoesNotExist:
                return Response({"error": "Uploaded video not found."}, status=status.HTTP_404_NOT_FOUND)

        elif source_type == "catalog_movie" and movie_id:
            try:
                movie = Movie.objects.get(id=movie_id)
                room.movie = movie
                room.movie_title = movie.title
                room.current_time_seconds = 0.0
                room.is_playing = True
                room.save()

                playback_payload = {
                    "source_type": movie.source_type,
                    "source_url": movie.source_url,
                    "source_video_id": movie.source_video_id,
                    "title": movie.title,
                    "movie_id": str(movie.id),
                    "is_local_device": False,
                }
            except Movie.DoesNotExist:
                return Response({"error": "Catalog movie not found."}, status=status.HTTP_404_NOT_FOUND)

        elif source_type == "local_device":
            # Inform room that a participant is previewing a local video
            title = request.data.get("title", "Local Device Video")
            playback_payload = {
                "source_type": "local_device",
                "title": title,
                "is_local_device": True,
                "message": f"{user} loaded a local video file ({title}) on their device.",
            }

        else:
            return Response({"error": "Invalid video selection parameters."}, status=status.HTTP_400_BAD_REQUEST)

        # Broadcast video switch to room channel group
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"room_{room.code}",
                {
                    "type": "room_video_change_event",
                    "payload": {
                        "room_code": room.code,
                        "user": user,
                        "playback_payload": playback_payload,
                    },
                },
            )

        return Response(
            {
                "message": "Video changed successfully.",
                "room": RoomSerializer(room, context={"request": request}).data,
                "video": playback_payload,
            },
            status=status.HTTP_200_OK,
        )


class RoomWatchlistView(APIView):
    """
    List, add, or remove movies in the shared room watchlist.
    """
    permission_classes = [AllowAny]

    def get(self, request, code):
        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        items = room.watchlist_items.all()
        serializer = RoomWatchlistItemSerializer(items, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, code):
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        from apps.movies.models import Movie

        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        movie_id = request.data.get("movie_id")
        if not movie_id:
            return Response({"error": "movie_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            movie = Movie.objects.get(id=movie_id)
        except Movie.DoesNotExist:
            return Response({"error": "Movie not found."}, status=status.HTTP_404_NOT_FOUND)

        suggested_by = request.data.get("username") or (
            request.user.username if request.user.is_authenticated else "Viewer"
        )

        item, created = RoomWatchlistItem.objects.get_or_create(
            room=room,
            movie=movie,
            defaults={"suggested_by": suggested_by},
        )
        if not created:
            return Response({"error": "Movie is already in the watchlist."}, status=status.HTTP_400_BAD_REQUEST)

        # Broadcast watchlist addition to room
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"room_{room.code}",
                {
                    "type": "room_watchlist_event",
                    "payload": {
                        "action": "item_added",
                        "item": RoomWatchlistItemSerializer(item, context={"request": request}).data,
                        "suggested_by": suggested_by,
                    },
                },
            )

        return Response(
            RoomWatchlistItemSerializer(item, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, code):
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        item_id = request.query_params.get("item_id")
        if not item_id:
            return Response({"error": "item_id query param is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = RoomWatchlistItem.objects.get(id=item_id, room=room)
            movie_title = item.movie.title
            item.delete()

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"room_{room.code}",
                    {
                        "type": "room_watchlist_event",
                        "payload": {
                            "action": "item_removed",
                            "item_id": item_id,
                            "movie_title": movie_title,
                        },
                    },
                )
            return Response({"message": f"'{movie_title}' removed from watchlist."}, status=status.HTTP_200_OK)
        except RoomWatchlistItem.DoesNotExist:
            return Response({"error": "Watchlist item not found."}, status=status.HTTP_404_NOT_FOUND)


class RoomWatchlistVoteView(APIView):
    """
    Cast or switch a vote for a watchlist movie.
    A user can only vote for one movie at a time in a room.
    """
    permission_classes = [AllowAny]

    def post(self, request, code):
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        item_id = request.data.get("item_id")
        username = request.data.get("username") or (
            request.user.username if request.user.is_authenticated else "Viewer"
        )

        try:
            item = RoomWatchlistItem.objects.get(id=item_id, room=room)
        except RoomWatchlistItem.DoesNotExist:
            return Response({"error": "Watchlist item not found."}, status=status.HTTP_404_NOT_FOUND)

        # Update or create user's single active vote in this room
        vote, created = RoomWatchlistVote.objects.update_or_create(
            room=room,
            username=username,
            defaults={"item": item},
        )

        # Broadcast updated watchlist state to all participants
        channel_layer = get_channel_layer()
        if channel_layer:
            updated_items = RoomWatchlistItemSerializer(
                room.watchlist_items.all(), many=True, context={"request": request}
            ).data
            async_to_sync(channel_layer.group_send)(
                f"room_{room.code}",
                {
                    "type": "room_watchlist_event",
                    "payload": {
                        "action": "vote_updated",
                        "username": username,
                        "voted_movie": item.movie.title,
                        "items": updated_items,
                    },
                },
            )

        return Response(
            {
                "message": f"Vote recorded for {item.movie.title}.",
                "vote_id": str(vote.id),
                "items": RoomWatchlistItemSerializer(
                    room.watchlist_items.all(), many=True, context={"request": request}
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class RoomWatchlistSelectWinnerView(APIView):
    """
    Finalize voting and start watching the selected or leading watchlist movie.
    Only allows movies with authorized playable video sources to start streaming.
    """
    permission_classes = [AllowAny]

    def post(self, request, code):
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        try:
            room = Room.objects.get(code=code)
        except Room.DoesNotExist:
            return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        item_id = request.data.get("item_id")
        user = request.data.get("user") or (
            request.user.username if request.user.is_authenticated else "Host"
        )

        if item_id:
            try:
                selected_item = RoomWatchlistItem.objects.get(id=item_id, room=room)
            except RoomWatchlistItem.DoesNotExist:
                return Response({"error": "Specified watchlist item not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Pick highest voted movie; if tie, pick the earliest suggested
            items = room.watchlist_items.all()
            if not items.exists():
                return Response({"error": "Watchlist is empty. Suggest a movie first."}, status=status.HTTP_400_BAD_REQUEST)
            selected_item = max(items, key=lambda i: (i.vote_count, -i.created_at.timestamp()))

        movie = selected_item.movie

        # Verify legitimate playable source exists
        if movie.source_type == "unavailable" or (not movie.source_url and not movie.source_video_id):
            return Response(
                {"error": f"'{movie.title}' does not have an authorized playable stream available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update room active movie and reset playback to 0.0s
        room.movie = movie
        room.movie_title = movie.title
        room.current_time_seconds = 0.0
        room.is_playing = True
        room.save()

        playback_payload = {
            "source_type": movie.source_type,
            "source_url": movie.source_url,
            "source_video_id": movie.source_video_id,
            "title": movie.title,
            "movie_id": str(movie.id),
            "is_local_device": False,
        }

        # Broadcast video change event across WebSocket to all room members
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"room_{room.code}",
                {
                    "type": "room_video_change_event",
                    "payload": {
                        "room_code": room.code,
                        "user": user,
                        "playback_payload": playback_payload,
                    },
                },
            )

        return Response(
            {
                "message": f"Selected '{movie.title}' from watchlist. Streaming started!",
                "room": RoomSerializer(room, context={"request": request}).data,
                "video": playback_payload,
            },
            status=status.HTTP_200_OK,
        )


class MovieNightSessionListView(generics.ListCreateAPIView):
    """
    List past movie night sessions/memories for the current user or host,
    or archive an active room into a saved Movie Night Session memory.
    """
    permission_classes = [AllowAny]
    serializer_class = MovieNightSessionSerializer

    def get_queryset(self):
        user = self.request.user
        username = self.request.query_params.get("username", "").strip()
        if user.is_authenticated:
            names = [user.username]
            if hasattr(user, "profile") and user.profile.display_name:
                names.append(user.profile.display_name)
            if username:
                names.append(username)
            return MovieNightSession.objects.filter(host_username__in=names)
        elif username:
            return MovieNightSession.objects.filter(host_username=username)
        return MovieNightSession.objects.all()[:20]

    def create(self, request, *args, **kwargs):
        data = request.data
        room_code = data.get("room_code")
        title = data.get("title", "Watch Party")
        movie_title = data.get("movie_title", "Movie")
        movie_poster = data.get("movie_poster", "")
        host_username = data.get("host_username") or (request.user.username if request.user.is_authenticated else "Host")
        participants = data.get("participants", [])
        vibe_tag = data.get("vibe_tag", "Epic Movie Night")
        notes = data.get("notes", "")

        session = MovieNightSession.objects.create(
            room_code=room_code,
            title=title,
            movie_title=movie_title,
            movie_poster=movie_poster,
            host_username=host_username,
            participants=participants,
            vibe_tag=vibe_tag,
            notes=notes,
        )
        return Response(MovieNightSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class MovieNightRatingView(APIView):
    """
    Submit or update a participant rating (1-5 stars) and review for a movie night session.
    """
    permission_classes = [AllowAny]

    def post(self, request, session_id):
        try:
            session = MovieNightSession.objects.get(id=session_id)
        except MovieNightSession.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

        username = request.data.get("username") or (request.user.username if request.user.is_authenticated else "Participant")
        rating_val = int(request.data.get("rating", 5))
        rating_val = max(1, min(5, rating_val))
        review_text = request.data.get("review", "").strip()

        rating_obj, _ = MovieNightRating.objects.update_or_create(
            session=session,
            username=username,
            defaults={"rating": rating_val, "review": review_text},
        )
        return Response(MovieNightRatingSerializer(rating_obj).data, status=status.HTTP_200_OK)



