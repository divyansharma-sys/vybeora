from django.test import TestCase
from apps.movies.models import Movie, MovieSource

class MovieLegalRightsTestCase(TestCase):
    def setUp(self):
        self.movie = Movie.objects.create(
            title="Charade",
            genre="Mystery",
            year=1963,
            duration="1h 53m",
            description="Classic romantic comedy mystery thriller directed by Stanley Donen.",
            is_free=True,
            is_embeddable=True,
            source_type="archive_org",
            source_video_id="charade_1963",
            source_url="https://archive.org/details/charade_1963",
        )
        self.source = MovieSource.objects.create(
            movie=self.movie,
            provider="internet_archive",
            item_identifier="charade_1963",
            source_page_url="https://archive.org/details/charade_1963",
            license_type="Public Domain (US)",
            license_evidence="Published in the US in 1963 without the required statutory copyright notice.",
            attribution_requirements="Attribution to Stanley Donen and Universal Pictures (1963).",
            streaming_permitted=True,
            embedding_permitted=True,
            redistribution_permitted=True,
            verification_status="verified",
        )

    def test_movie_source_relationship(self):
        self.assertEqual(self.movie.sources.count(), 1)
        source = self.movie.sources.first()
        self.assertTrue(source.is_verified)
        self.assertTrue(source.streaming_permitted)
        self.assertTrue(source.embedding_permitted)

    def test_unverified_movie_guard(self):
        restricted_movie = Movie.objects.create(
            title="Commercial Feature Film",
            genre="Action",
            year=2023,
            duration="2h 10m",
            description="Under copyright.",
            is_free=False,
            is_embeddable=False,
            source_type="unavailable",
        )
        source = MovieSource.objects.create(
            movie=restricted_movie,
            provider="restricted_third_party",
            item_identifier="commercial_2023",
            source_page_url="https://example.com/restricted",
            license_type="All Rights Reserved",
            license_evidence="Commercial copyright registered. No open streaming authorization.",
            streaming_permitted=False,
            embedding_permitted=False,
            redistribution_permitted=False,
            verification_status="restricted",
        )
        self.assertFalse(source.is_verified)
        self.assertFalse(source.streaming_permitted)
        self.assertFalse(source.embedding_permitted)
        self.assertFalse(restricted_movie.is_embeddable)
