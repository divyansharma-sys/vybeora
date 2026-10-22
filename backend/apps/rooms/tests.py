import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.rooms.models import Room, RoomParticipant
from apps.movies.models import Movie

User = get_user_model()


class PrivateWatchPartySecurityTests(TestCase):
    """
    Automated security and privacy test suite for Vybeora Friends Watch Parties:
    1. Rooms are private by default.
    2. Room codes are unpredictable 8-character hex strings.
    3. Public users cannot browse active rooms created by other people.
    4. Hosts can only list their own rooms.
    5. Friends join with room code successfully.
    6. Non-existent or expired room codes return 404.
    7. Passcode protection is enforced for private rooms with passcodes.
    """

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(username="usera", email="a@vybeora.local", password="Password123!")
        self.user_b = User.objects.create_user(username="userb", email="b@vybeora.local", password="Password123!")
        self.user_c = User.objects.create_user(username="userc", email="c@vybeora.local", password="Password123!")

        self.movie = Movie.objects.create(
            title="Night of the Living Dead",
            year=1968,
            genre="Horror",
            duration="1h 36m",
            source_url="https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4",
        )

    def test_room_creation_is_private_by_default_with_secure_code(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post("/api/rooms/", {
            "title": "Movie Night with Friends",
            "movie": self.movie.id,
            "host_name": self.user_a.username,
        }, format="json")

        self.assertEqual(response.status_code, 201)
        data = response.json()
        room_code = data["code"]

        # Code starts with vybe- followed by 8 hex characters
        self.assertTrue(room_code.startswith("vybe-"))
        self.assertEqual(len(room_code.split("-")[1]), 8)

        # Database record must be private
        room = Room.objects.get(code=room_code)
        self.assertTrue(room.is_private)
        self.assertEqual(room.host_name, "usera")

    def test_public_user_cannot_browse_active_rooms(self):
        # User A creates a room
        room = Room.objects.create(
            title="Secret Room",
            code="vybe-secret1",
            host_name="usera",
            movie_title="Night of the Living Dead",
            is_private=True,
            status="active",
        )

        # Anonymous caller requests room list
        anon_client = APIClient()
        response = anon_client.get("/api/rooms/")
        self.assertEqual(response.status_code, 200)
        anon_rooms = response.json().get("results", response.json())
        self.assertEqual(len(anon_rooms), 0, "Public anonymous caller should see 0 rooms")

        # Unrelated User C requests room list
        user_c_client = APIClient()
        user_c_client.force_authenticate(user=self.user_c)
        response_c = user_c_client.get("/api/rooms/")
        self.assertEqual(response_c.status_code, 200)
        c_rooms = response_c.json().get("results", response_c.json())
        self.assertEqual(len(c_rooms), 0, "User C should not see User A's private room")

    def test_host_can_see_only_their_own_rooms(self):
        # User A has 1 room
        Room.objects.create(
            title="User A Room",
            code="vybe-usera1",
            host_name="usera",
            status="active",
            is_private=True,
        )
        # User B has 1 room
        Room.objects.create(
            title="User B Room",
            code="vybe-userb1",
            host_name="userb",
            status="active",
            is_private=True,
        )

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/rooms/")
        self.assertEqual(response.status_code, 200)
        results = response.json().get("results", response.json())
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["code"], "vybe-usera1")

    def test_friend_can_join_with_valid_room_code(self):
        room = Room.objects.create(
            title="Fun Party",
            code="vybe-join1234",
            host_name="usera",
            status="active",
            is_private=True,
        )

        friend_client = APIClient()
        friend_client.force_authenticate(user=self.user_b)
        response = friend_client.post(f"/api/rooms/{room.code}/join/", {
            "username": "userb",
        }, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["code"], "vybe-join1234")

        # Check participant is recorded
        self.assertTrue(RoomParticipant.objects.filter(room=room, username="userb").exists())

    def test_invalid_room_code_rejected(self):
        friend_client = APIClient()
        response = friend_client.post("/api/rooms/vybe-nonexistent/join/", {
            "username": "userb",
        }, format="json")
        self.assertEqual(response.status_code, 404)

    def test_passcode_protected_room_enforcement(self):
        room = Room.objects.create(
            title="VIP Party",
            code="vybe-pass1234",
            host_name="usera",
            status="active",
            is_private=True,
            passcode="supersecret",
        )

        friend_client = APIClient()

        # Attempt with wrong passcode
        bad_response = friend_client.post(f"/api/rooms/{room.code}/join/", {
            "username": "userb",
            "passcode": "wrongcode",
        }, format="json")
        self.assertEqual(bad_response.status_code, 403)

        # Attempt with correct passcode
        good_response = friend_client.post(f"/api/rooms/{room.code}/join/", {
            "username": "userb",
            "passcode": "supersecret",
        }, format="json")
        self.assertEqual(good_response.status_code, 200)

    def test_shared_watchlist_and_single_vote_enforcement(self):
        # Create second movie for voting competition
        movie_b = Movie.objects.create(
            title="Carnival of Souls",
            year=1962,
            genre="Mystery",
            duration="1h 22m",
            source_url="https://archive.org/download/CarnivalOfSouls_1962/CarnivalOfSouls_1962_512kb.mp4",
        )

        room = Room.objects.create(
            title="Watchlist Voting Room",
            code="vybe-votetest1",
            host_name="usera",
            status="active",
            is_private=True,
        )

        # 1. User A adds movie A to watchlist
        client_a = APIClient()
        res_add_a = client_a.post(f"/api/rooms/{room.code}/watchlist/", {
            "movie_id": str(self.movie.id),
            "username": "usera",
        }, format="json")
        self.assertEqual(res_add_a.status_code, 201)
        item_a_id = res_add_a.json()["id"]

        # 2. Duplicate movie in watchlist rejected
        res_dup = client_a.post(f"/api/rooms/{room.code}/watchlist/", {
            "movie_id": str(self.movie.id),
            "username": "userb",
        }, format="json")
        self.assertEqual(res_dup.status_code, 400)

        # 3. User B adds movie B to watchlist
        client_b = APIClient()
        res_add_b = client_b.post(f"/api/rooms/{room.code}/watchlist/", {
            "movie_id": str(movie_b.id),
            "username": "userb",
        }, format="json")
        self.assertEqual(res_add_b.status_code, 201)
        item_b_id = res_add_b.json()["id"]

        # 4. User B votes for movie B
        res_vote_b = client_b.post(f"/api/rooms/{room.code}/watchlist/vote/", {
            "item_id": item_b_id,
            "username": "userb",
        }, format="json")
        self.assertEqual(res_vote_b.status_code, 200)

        # 5. User B switches vote to movie A: single vote per user enforced
        res_switch = client_b.post(f"/api/rooms/{room.code}/watchlist/vote/", {
            "item_id": item_a_id,
            "username": "userb",
        }, format="json")
        self.assertEqual(res_switch.status_code, 200)

        # Verify movie A now has 1 vote and movie B has 0 votes from user B
        room.refresh_from_db()
        items = client_a.get(f"/api/rooms/{room.code}/watchlist/").json()
        item_a_data = next(i for i in items if i["id"] == item_a_id)
        item_b_data = next(i for i in items if i["id"] == item_b_id)
        self.assertEqual(item_a_data["vote_count"], 1)
        self.assertEqual(item_b_data["vote_count"], 0)

        # 6. Select winning movie starts playback
        res_winner = client_a.post(f"/api/rooms/{room.code}/watchlist/select-winner/", {
            "item_id": item_a_id,
            "user": "usera",
        }, format="json")
        self.assertEqual(res_winner.status_code, 200)

        room.refresh_from_db()
        self.assertEqual(room.movie.title, "Night of the Living Dead")
        self.assertTrue(room.is_playing)
        self.assertEqual(room.current_time_seconds, 0.0)

