from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import Movie, MovieSource, MovieSuggestion
from .serializers import MovieSerializer, MovieSuggestionSerializer
from .services.archive_service import InternetArchiveService


class MovieListView(generics.ListAPIView):
    """
    List all movies with search, genre, and language filtering.
    """
    permission_classes = [AllowAny]
    serializer_class = MovieSerializer

    def get_queryset(self):
        queryset = Movie.objects.prefetch_related("sources").all()
        genre = self.request.query_params.get("genre")
        language = self.request.query_params.get("language")
        search = self.request.query_params.get("search")
        featured = self.request.query_params.get("featured")
        free_only = self.request.query_params.get("free")

        if genre and genre.lower() != "all":
            queryset = queryset.filter(genre__icontains=genre)
        if language and language.lower() != "all":
            queryset = queryset.filter(language__iexact=language)
        if search:
            queryset = queryset.filter(title__icontains=search) | queryset.filter(description__icontains=search)
        if featured:
            queryset = queryset.filter(is_featured=True)
        if free_only:
            queryset = queryset.filter(is_free=True)

        return queryset


class MovieDetailView(generics.RetrieveAPIView):
    """
    Retrieve single movie detail with playback sources and legal rights verification.
    """
    permission_classes = [AllowAny]
    serializer_class = MovieSerializer
    queryset = Movie.objects.prefetch_related("sources").all()
    lookup_field = "id"


class MovieSuggestView(generics.CreateAPIView):
    """
    Submit a movie suggestion for community watch parties.
    """
    permission_classes = [AllowAny]
    serializer_class = MovieSuggestionSerializer
    queryset = MovieSuggestion.objects.all()


class InternetArchiveDiscoverView(APIView):
    """
    Live discovery endpoint querying Internet Archive Advanced Search API.
    Used for exploring public domain and open movies from archive.org.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "feature films").strip()
        rows = int(request.query_params.get("rows", 10))
        results = InternetArchiveService.search_feature_films(query=query, rows=min(rows, 25))
        return Response({
            "provider": "Internet Archive (archive.org)",
            "query": query,
            "results_count": len(results),
            "results": results,
        }, status=status.HTTP_200_OK)
