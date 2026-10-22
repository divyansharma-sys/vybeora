import uuid
from django.db import models


class Movie(models.Model):
    """
    Catalog movie metadata (distinct from specific playback sources).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, db_index=True)
    genre = models.CharField(max_length=100, db_index=True)
    year = models.IntegerField(default=2025)
    duration = models.CharField(max_length=50, default="1h 30m")
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=8.0)
    language = models.CharField(max_length=50, default="English", db_index=True)
    description = models.TextField(blank=True)
    poster_url = models.URLField(max_length=500, blank=True)
    
    # Primary playback link shorthand
    source_type = models.CharField(
        max_length=30,
        choices=[
            ("direct_video", "Direct Video Stream (MP4/WebM)"),
            ("archive_org", "Internet Archive Stream/Embed"),
            ("youtube", "YouTube Embed API"),
            ("unavailable", "Unavailable / Restricted"),
        ],
        default="direct_video",
    )
    source_url = models.URLField(max_length=500, blank=True)
    source_video_id = models.CharField(max_length=100, blank=True)
    license_info = models.CharField(max_length=255, default="Public Domain / Open License")
    is_free = models.BooleanField(default=True, db_index=True)
    is_embeddable = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.year})"


class MovieSource(models.Model):
    """
    Verified Playback Source and Rights Record.
    Explicitly tracks origin, streaming/embedding permissions, and verification status.
    """
    PROVIDER_CHOICES = [
        ("internet_archive", "Internet Archive (archive.org)"),
        ("blender_foundation", "Blender Foundation (Open Content)"),
        ("public_domain_direct", "Verified Public Domain Direct Archive"),
        ("restricted_third_party", "Restricted / Unverified"),
    ]

    VERIFICATION_STATUS_CHOICES = [
        ("verified", "Verified Legal & Playable"),
        ("restricted", "Restricted Rights / Non-Embeddable"),
        ("unavailable", "Unavailable / Broken Source"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name="sources")
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES, default="internet_archive")
    item_identifier = models.CharField(max_length=150, blank=True, help_text="e.g. IA identifier")
    source_page_url = models.URLField(max_length=500, help_text="Provenance page on provider site")
    stream_url = models.URLField(max_length=500, help_text="Direct playable video URL or official embed URL")
    
    # Specific Rights & Licensing Checklist
    license_type = models.CharField(max_length=100, default="Public Domain")
    license_evidence = models.TextField(help_text="Documentation/evidence for copyright status or license grant")
    attribution_requirements = models.CharField(max_length=255, blank=True)
    
    streaming_permitted = models.BooleanField(default=True, help_text="Permitted for online viewing")
    embedding_permitted = models.BooleanField(default=True, help_text="Permitted to embed within Vybeora")
    redistribution_permitted = models.BooleanField(default=False, help_text="Permitted to re-host or distribute")
    
    verification_status = models.CharField(max_length=30, choices=VERIFICATION_STATUS_CHOICES, default="verified")
    last_verified_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_verified_at"]

    @property
    def is_verified(self):
        return self.verification_status == "verified" and self.embedding_permitted

    def __str__(self):
        return f"Source for {self.movie.title}: {self.provider} [{self.verification_status}]"


class MovieSuggestion(models.Model):
    """
    Community movie suggestions for watch parties.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name="suggestions")
    suggested_by = models.CharField(max_length=150, default="Anonymous")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Suggestion: {self.movie.title}"
