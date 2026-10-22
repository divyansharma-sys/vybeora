from rest_framework import serializers
from .models import Movie, MovieSource, MovieSuggestion


class MovieSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovieSource
        fields = [
            "id",
            "provider",
            "item_identifier",
            "source_page_url",
            "stream_url",
            "license_type",
            "license_evidence",
            "attribution_requirements",
            "streaming_permitted",
            "embedding_permitted",
            "redistribution_permitted",
            "verification_status",
            "last_verified_at",
        ]


class MovieSerializer(serializers.ModelSerializer):
    sources = MovieSourceSerializer(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = [
            "id",
            "title",
            "genre",
            "year",
            "duration",
            "rating",
            "language",
            "description",
            "poster_url",
            "source_type",
            "source_url",
            "source_video_id",
            "license_info",
            "is_free",
            "is_embeddable",
            "is_featured",
            "sources",
            "created_at",
        ]


class MovieSuggestionSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(source="movie.title", read_only=True)

    class Meta:
        model = MovieSuggestion
        fields = ["id", "movie", "movie_title", "suggested_by", "notes", "created_at"]
