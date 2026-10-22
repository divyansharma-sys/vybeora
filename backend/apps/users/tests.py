from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


class AuthenticationFlowTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_signup_success(self):
        payload = {
            "full_name": "Maya Lin",
            "email": "maya.lin@example.com",
            "username": "mayalin",
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!",
            "agree_terms": True,
        }
        res = self.client.post("/api/auth/signup/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", res.data)
        self.assertIn("access", res.data["tokens"])
        self.assertIn("refresh", res.data["tokens"])
        self.assertEqual(res.data["user"]["email"], "maya.lin@example.com")
        self.assertEqual(res.data["user"]["full_name"], "Maya Lin")

    def test_signup_validation_mismatched_passwords(self):
        payload = {
            "full_name": "Maya Lin",
            "email": "maya2@example.com",
            "password": "StrongPassword123!",
            "confirm_password": "DifferentPassword123!",
            "agree_terms": True,
        }
        res = self.client.post("/api/auth/signup/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", res.data["error"]["details"])

    def test_signup_duplicate_email(self):
        User.objects.create_user(username="existing", email="duplicate@example.com", password="Pass1234!")
        payload = {
            "full_name": "Another Person",
            "email": "duplicate@example.com",
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!",
            "agree_terms": True,
        }
        res = self.client.post("/api/auth/signup/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", res.data["error"]["details"])

    def test_login_success_and_logout(self):
        user = User.objects.create_user(username="alex_rivers", email="alex@vybeora.test", password="MySecurePassword123!")
        
        # Login with email
        login_res = self.client.post("/api/auth/login/", {
            "identifier": "alex@vybeora.test",
            "password": "MySecurePassword123!"
        }, format="json")
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        access_token = login_res.data["tokens"]["access"]
        refresh_token = login_res.data["tokens"]["refresh"]

        # Authenticated /api/auth/me/
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        me_res = self.client.get("/api/auth/me/")
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data["username"], "alex_rivers")

        # Logout with token blacklisting
        logout_res = self.client.post("/api/auth/logout/", {"refresh": refresh_token}, format="json")
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Attempt to refresh with blacklisted token
        refresh_res = self.client.post("/api/auth/token/refresh/", {"refresh": refresh_token}, format="json")
        self.assertEqual(refresh_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_invalid_credentials(self):
        res = self.client.post("/api/auth/login/", {
            "identifier": "nonexistent@example.com",
            "password": "WrongPassword123!"
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("Invalid email/username or password", res.data["error"]["message"])

    def test_forgot_and_reset_password(self):
        user = User.objects.create_user(username="reset_user", email="reset@vybeora.test", password="InitialPassword123!")
        
        forgot_res = self.client.post("/api/auth/forgot-password/", {"email": "reset@vybeora.test"}, format="json")
        self.assertEqual(forgot_res.status_code, status.HTTP_200_OK)
        uid = forgot_res.data["uid"]
        token = forgot_res.data["token"]
        self.assertIsNotNone(token)

        reset_res = self.client.post("/api/auth/reset-password/", {
            "uid": uid,
            "token": token,
            "new_password": "NewStrongPassword456!",
            "confirm_password": "NewStrongPassword456!",
        }, format="json")
        self.assertEqual(reset_res.status_code, status.HTTP_200_OK)

        # Confirm new password works
        login_res = self.client.post("/api/auth/login/", {
            "identifier": "reset@vybeora.test",
            "password": "NewStrongPassword456!"
        }, format="json")
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)


class FriendsAndInvitationsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username="host_friend", email="host@vybeora.test", password="Password123!")
        self.user2 = User.objects.create_user(username="guest_friend", email="guest@vybeora.test", password="Password123!")

        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)

    def test_search_and_friend_request_flow(self):
        # 1. Search for user2
        search_res = self.client.get("/api/auth/friends/search/?q=guest")
        self.assertEqual(search_res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(u["username"] == "guest_friend" for u in search_res.data))

        # 2. Send friend request to user2
        req_res = self.client.post("/api/auth/friends/request/", {"username": "guest_friend"}, format="json")
        self.assertEqual(req_res.status_code, status.HTTP_201_CREATED)

        # 3. User2 accepts request
        self.client.force_authenticate(user=self.user2)
        friends_res = self.client.get("/api/auth/friends/")
        self.assertEqual(friends_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(friends_res.data["incoming_requests"]), 1)
        friendship_id = friends_res.data["incoming_requests"][0]["id"]

        accept_res = self.client.patch("/api/auth/friends/request/", {
            "friendship_id": friendship_id,
            "action": "accept"
        }, format="json")
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)

        # Confirm user2 now has user1 as friend
        updated_friends = self.client.get("/api/auth/friends/")
        self.assertEqual(len(updated_friends.data["friends"]), 1)
        self.assertEqual(updated_friends.data["friends"][0]["username"], "host_friend")

    def test_direct_room_invitation_flow(self):
        from apps.rooms.models import Room
        room = Room.objects.create(code="vybe-testinvite", title="Friday Sci-Fi Night", host_name="host_friend")

        # User1 invites user2 to room
        invite_res = self.client.post("/api/auth/invitations/", {
            "recipient_username": "guest_friend",
            "room_code": "vybe-testinvite"
        }, format="json")
        self.assertEqual(invite_res.status_code, status.HTTP_201_CREATED)

        # User2 checks their invitations
        self.client.force_authenticate(user=self.user2)
        invites_list = self.client.get("/api/auth/invitations/")
        self.assertEqual(invites_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(invites_list.data), 1)
        self.assertEqual(invites_list.data[0]["room_code"], "vybe-testinvite")

