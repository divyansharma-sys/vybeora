from django.core.management.base import BaseCommand
from apps.movies.models import Movie, MovieSource
from apps.rooms.models import Room, RoomParticipant
from apps.chat.models import ChatMessage


class Command(BaseCommand):
    help = "Seed verified legal public-domain and open-licensed movies with explicit rights and source records"

    def handle(self, *args, **options):
        self.stdout.write("Seeding verified legal movie sources & rights records...")

        # Clear existing entries for fresh, clean legal data
        MovieSource.objects.all().delete()
        ChatMessage.objects.all().delete()
        Room.objects.all().delete()
        Movie.objects.all().delete()

        catalogue = [
            {
                "movie": {
                    "title": "Night of the Living Dead",
                    "genre": "Horror • Classic",
                    "year": 1968,
                    "duration": "1h 36m",
                    "rating": 7.9,
                    "language": "English",
                    "description": "George A. Romero's groundbreaking independent horror masterpiece. A disparate group of individuals seeks refuge in an abandoned farmhouse when the dead reanimate.",
                    "poster_url": "https://upload.wikimedia.org/wikipedia/commons/a/a1/Night_of_the_Living_Dead-1.jpg",
                    "source_type": "archive_org",
                    "source_url": "https://archive.org/embed/night_of_the_living_dead_dvd",
                    "source_video_id": "night_of_the_living_dead_dvd",
                    "license_info": "Public Domain in the United States",
                    "is_free": True,
                    "is_embeddable": True,
                    "is_featured": True,
                },
                "source": {
                    "provider": "internet_archive",
                    "item_identifier": "night_of_the_living_dead_dvd",
                    "source_page_url": "https://archive.org/details/night_of_the_living_dead_dvd",
                    "stream_url": "https://archive.org/embed/night_of_the_living_dead_dvd",
                    "license_type": "Public Domain (US Copyright Law)",
                    "license_evidence": "The original theatrical distributor (Continental Distributing / Walter Reade) omitted the required statutory copyright notice when changing the title from 'Night of the Flesh Eaters', placing the original film in the public domain upon publication in 1968.",
                    "attribution_requirements": "Directed by George A. Romero; Image Ten / Continental Distributing",
                    "streaming_permitted": True,
                    "embedding_permitted": True,
                    "redistribution_permitted": True,
                    "verification_status": "verified",
                },
            },
            {
                "movie": {
                    "title": "Charade",
                    "genre": "Mystery • Romance • Thriller",
                    "year": 1963,
                    "duration": "1h 53m",
                    "rating": 7.9,
                    "language": "English",
                    "description": "Stanley Donen's iconic mystery starring Cary Grant and Audrey Hepburn. A young widow in Paris is pursued by several conspirators seeking her late husband's hidden fortune.",
                    "poster_url": "https://upload.wikimedia.org/wikipedia/commons/f/fd/Charade_%281963_poster%29.jpg",
                    "source_type": "archive_org",
                    "source_url": "https://archive.org/embed/charade1963",
                    "source_video_id": "charade1963",
                    "license_info": "Public Domain in the United States",
                    "is_free": True,
                    "is_embeddable": True,
                    "is_featured": True,
                },
                "source": {
                    "provider": "internet_archive",
                    "item_identifier": "charade1963",
                    "source_page_url": "https://archive.org/details/charade1963",
                    "stream_url": "https://archive.org/embed/charade1963",
                    "license_type": "Public Domain (Defective Notice)",
                    "license_evidence": "Published without a valid copyright notice in 1963 (Universal Pictures omitted the word 'Copyright', 'Copr.', or symbol © in the title sequence), placing the US rights into the public domain immediately upon release.",
                    "attribution_requirements": "Directed by Stanley Donen; starring Cary Grant and Audrey Hepburn",
                    "streaming_permitted": True,
                    "embedding_permitted": True,
                    "redistribution_permitted": True,
                    "verification_status": "verified",
                },
            },
            {
                "movie": {
                    "title": "Big Buck Bunny",
                    "genre": "Animation • Comedy • Family",
                    "year": 2008,
                    "duration": "10m",
                    "rating": 8.0,
                    "language": "English",
                    "description": "The acclaimed open-source animated short film by the Blender Institute. A gentle giant rabbit seeks justice against forest bullies using ingenious contraptions.",
                    "poster_url": "https://upload.wikimedia.org/wikipedia/commons/c/c5/Big_buck_bunny_poster_big.jpg",
                    "source_type": "direct_video",
                    "source_url": "https://archive.org/download/BigBuckBunny_124/Content%2Fbig_buck_bunny_720p_surround.mp4",
                    "source_video_id": "BigBuckBunny_124",
                    "license_info": "Creative Commons Attribution 3.0",
                    "is_free": True,
                    "is_embeddable": True,
                    "is_featured": False,
                },
                "source": {
                    "provider": "blender_foundation",
                    "item_identifier": "BigBuckBunny_124",
                    "source_page_url": "https://peach.blender.org/",
                    "stream_url": "https://archive.org/download/BigBuckBunny_124/Content%2Fbig_buck_bunny_720p_surround.mp4",
                    "license_type": "Creative Commons Attribution 3.0 Unported (CC BY 3.0)",
                    "license_evidence": "Published openly by the Blender Foundation (Blender Institute) under CC BY 3.0, explicitly permitting streaming, embedding, modification, and redistribution with attribution.",
                    "attribution_requirements": "© 2008, Blender Foundation / www.bigbuckbunny.org",
                    "streaming_permitted": True,
                    "embedding_permitted": True,
                    "redistribution_permitted": True,
                    "verification_status": "verified",
                },
            },
            {
                "title": "The General",
                "movie": {
                    "title": "The General",
                    "genre": "Action • Comedy • Classic",
                    "year": 1926,
                    "duration": "1h 15m",
                    "rating": 8.1,
                    "language": "Silent / English",
                    "description": "Buster Keaton's comedy and action masterpiece. Celebrated for Keaton's astonishing authentic locomotive stunts, physical genius, and visual storytelling.",
                    "poster_url": "https://upload.wikimedia.org/wikipedia/commons/c/cd/The_general_movie_poster.jpg",
                    "source_type": "archive_org",
                    "source_url": "https://archive.org/embed/TheGeneral_BusterKeaton",
                    "source_video_id": "TheGeneral_BusterKeaton",
                    "license_info": "Public Domain Worldwide",
                    "is_free": True,
                    "is_embeddable": True,
                    "is_featured": False,
                },
                "source": {
                    "provider": "internet_archive",
                    "item_identifier": "TheGeneral_BusterKeaton",
                    "source_page_url": "https://archive.org/details/TheGeneral_BusterKeaton",
                    "stream_url": "https://archive.org/embed/TheGeneral_BusterKeaton",
                    "license_type": "Public Domain (Pre-1929 Expiration)",
                    "license_evidence": "Published in the United States in 1926. All works published before January 1, 1929 have entered the US public domain by statutory expiration of copyright terms.",
                    "attribution_requirements": "Directed by Clyde Bruckman and Buster Keaton; United Artists (1926)",
                    "streaming_permitted": True,
                    "embedding_permitted": True,
                    "redistribution_permitted": True,
                    "verification_status": "verified",
                },
            },
            {
                "movie": {
                    "title": "Tears of Steel",
                    "genre": "Sci-Fi • Action",
                    "year": 2012,
                    "duration": "12m",
                    "rating": 7.2,
                    "language": "English",
                    "description": "Blender Foundation's open-source live-action VFX project set in dystopian Amsterdam. A band of fighters and scientists attempts to prevent humanity's extinction.",
                    "poster_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Tos-poster.png/960px-Tos-poster.png.jpg",
                    "source_type": "direct_video",
                    "source_url": "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
                    "source_video_id": "Tears-of-Steel",
                    "license_info": "Creative Commons Attribution 3.0",
                    "is_free": True,
                    "is_embeddable": True,
                    "is_featured": False,
                },
                "source": {
                    "provider": "blender_foundation",
                    "item_identifier": "Tears-of-Steel",
                    "source_page_url": "https://mango.blender.org/",
                    "stream_url": "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
                    "license_type": "Creative Commons Attribution 3.0 Unported (CC BY 3.0)",
                    "license_evidence": "Released by the Blender Institute under CC BY 3.0. Explicit permission for global streaming and embedding.",
                    "attribution_requirements": "© 2012 Blender Foundation | mango.blender.org",
                    "streaming_permitted": True,
                    "embedding_permitted": True,
                    "redistribution_permitted": True,
                    "verification_status": "verified",
                },
            },
            {
                "movie": {
                    "title": "A Star Is Born",
                    "genre": "Drama • Classic",
                    "year": 1937,
                    "duration": "1h 51m",
                    "rating": 7.5,
                    "language": "English",
                    "description": "The original Academy Award-winning Technicolor Hollywood drama starring Janet Gaynor and Fredric March. An aspiring actress rises to fame while her mentor's career declines.",
                    "poster_url": "https://upload.wikimedia.org/wikipedia/commons/5/5c/A_Star_Is_Born_%281937_film_poster%29.jpg",
                    "source_type": "archive_org",
                    "source_url": "https://archive.org/embed/AStarIsBorn1937",
                    "source_video_id": "AStarIsBorn1937",
                    "license_info": "Public Domain in the United States",
                    "is_free": True,
                    "is_embeddable": True,
                    "is_featured": False,
                },
                "source": {
                    "provider": "internet_archive",
                    "item_identifier": "AStarIsBorn1937",
                    "source_page_url": "https://archive.org/details/AStarIsBorn1937",
                    "stream_url": "https://archive.org/embed/AStarIsBorn1937",
                    "license_type": "Public Domain (Non-Renewal)",
                    "license_evidence": "Copyright registered in 1937 by Selznick International Pictures; copyright was not renewed in its 28th year (1965), entering public domain under the 1909 US Copyright Act.",
                    "attribution_requirements": "Produced by David O. Selznick; United Artists (1937)",
                    "streaming_permitted": True,
                    "embedding_permitted": True,
                    "redistribution_permitted": True,
                    "verification_status": "verified",
                },
            },
            {
                "movie": {
                    "title": "Carnival of Souls",
                    "genre": "Horror • Mystery • Cult",
                    "year": 1962,
                    "duration": "1h 18m",
                    "rating": 7.1,
                    "language": "English",
                    "description": "Herk Harvey's eerie, atmospheric cult horror film. After surviving a drag-race plunge off a bridge, an organist finds herself drawn to an abandoned lakeside pavilion.",
                    "poster_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Carnival_of_Souls_poster.jpg/800px-Carnival_of_Souls_poster.jpg",
                    "source_type": "archive_org",
                    "source_url": "https://archive.org/embed/CarnivalOfSouls",
                    "source_video_id": "CarnivalOfSouls",
                    "license_info": "Public Domain in the United States",
                    "is_free": True,
                    "is_embeddable": True,
                    "is_featured": False,
                },
                "source": {
                    "provider": "internet_archive",
                    "item_identifier": "CarnivalOfSouls",
                    "source_page_url": "https://archive.org/details/CarnivalOfSouls",
                    "stream_url": "https://archive.org/embed/CarnivalOfSouls",
                    "license_type": "Public Domain (Defective Notice)",
                    "license_evidence": "Released without a proper copyright notice in 1962, forfeiting copyright protection under 17 U.S.C. prior to 1978.",
                    "attribution_requirements": "Directed by Herk Harvey; Herts-Lion International",
                    "streaming_permitted": True,
                    "embedding_permitted": True,
                    "redistribution_permitted": True,
                    "verification_status": "verified",
                },
            },
            {
                "movie": {
                    "title": "Restricted Commercial Stream Example",
                    "genre": "Sample Test Case",
                    "year": 2026,
                    "duration": "N/A",
                    "rating": 0.0,
                    "language": "English",
                    "description": "This entry explicitly tests Vybeora's legal verification safety barrier. Demonstrates how restricted rights or unverified playback sources are surfaced with clear legal explanations rather than broken players.",
                    "poster_url": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80",
                    "source_type": "unavailable",
                    "source_url": "",
                    "source_video_id": "",
                    "license_info": "Proprietary Commercial Rights / Not Licensed for Free Streaming",
                    "is_free": False,
                    "is_embeddable": False,
                    "is_featured": False,
                },
                "source": {
                    "provider": "restricted_third_party",
                    "item_identifier": "unverified_commercial",
                    "source_page_url": "https://example.com/restricted-catalog",
                    "stream_url": "",
                    "license_type": "All Rights Reserved (Commercial)",
                    "license_evidence": "Commercial title with no open license or public domain evidence. In-app streaming is intentionally withheld per Vybeora security policies.",
                    "attribution_requirements": "Proprietary Rights Holders",
                    "streaming_permitted": False,
                    "embedding_permitted": False,
                    "redistribution_permitted": False,
                    "verification_status": "restricted",
                },
            },
        ]

        created_count = 0
        for item in catalogue:
            movie_obj = Movie.objects.create(**item["movie"])
            source_data = item["source"]
            MovieSource.objects.create(movie=movie_obj, **source_data)
            created_count += 1

        self.stdout.write(f"Created {created_count} movies with verified MovieSource records.")

        # Seed initial watch room
        charade_movie = Movie.objects.get(title="Charade")
        room1 = Room.objects.create(
            code="charade-party",
            title="Charade (1963) Classic Mystery Hangout",
            host_name="Elena Rostova",
            movie=charade_movie,
            movie_title=charade_movie.title,
            genre=charade_movie.genre,
            is_private=False,
            max_participants=8,
            current_time_seconds=65.0,
            is_playing=True,
            status="active",
        )
        RoomParticipant.objects.create(room=room1, username="Elena Rostova", role="Host", is_active=True)
        RoomParticipant.objects.create(room=room1, username="Marcus Cole", role="Viewer", is_active=True)

        ChatMessage.objects.create(
            room=room1,
            user="Elena Rostova",
            is_host=True,
            text="Welcome to the public domain screening! Verified via Internet Archive.",
            timestamp_tag="01:05",
        )

        self.stdout.write(self.style.SUCCESS("Database seeded with legally verified sources!"))
