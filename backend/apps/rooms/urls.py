from django.urls import path
from .views import (
    RoomListCreateView,
    RoomDetailView,
    RoomJoinView,
    RoomVideoUploadView,
    RoomSelectVideoView,
    RoomWatchlistView,
    RoomWatchlistVoteView,
    RoomWatchlistSelectWinnerView,
    MovieNightSessionListView,
    MovieNightRatingView,
)

app_name = "rooms"

urlpatterns = [
    path("", RoomListCreateView.as_view(), name="room-list-create"),
    path("sessions/", MovieNightSessionListView.as_view(), name="room-sessions"),
    path("sessions/<uuid:session_id>/rating/", MovieNightRatingView.as_view(), name="session-rating"),
    path("<str:code>/", RoomDetailView.as_view(), name="room-detail"),
    path("<str:code>/join/", RoomJoinView.as_view(), name="room-join"),
    path("<str:code>/upload-video/", RoomVideoUploadView.as_view(), name="room-upload-video"),
    path("<str:code>/select-video/", RoomSelectVideoView.as_view(), name="room-select-video"),
    path("<str:code>/watchlist/", RoomWatchlistView.as_view(), name="room-watchlist"),
    path("<str:code>/watchlist/vote/", RoomWatchlistVoteView.as_view(), name="room-watchlist-vote"),
    path("<str:code>/watchlist/select-winner/", RoomWatchlistSelectWinnerView.as_view(), name="room-watchlist-select-winner"),
]
