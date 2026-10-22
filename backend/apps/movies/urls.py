from django.urls import path
from .views import (
    MovieListView,
    MovieDetailView,
    MovieSuggestView,
    InternetArchiveDiscoverView,
)

app_name = "movies"

urlpatterns = [
    path("", MovieListView.as_view(), name="movie-list"),
    path("archive-discover/", InternetArchiveDiscoverView.as_view(), name="archive-discover"),
    path("<uuid:id>/", MovieDetailView.as_view(), name="movie-detail"),
    path("suggest/", MovieSuggestView.as_view(), name="movie-suggest"),
]
