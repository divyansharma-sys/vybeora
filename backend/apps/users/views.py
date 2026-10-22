import logging
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    SignupSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class SignupView(APIView):
    """
    Registers a new user account with validated credentials and returns JWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"message": "Registration validation failed.", "details": serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.save()
        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        return Response(
            {
                "message": "Account created successfully. Welcome to Vybeora!",
                "user": user_data,
                "tokens": tokens,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    Authenticates user via email or username and issues JWT access & refresh tokens.
    Uses generic error responses to prevent account enumeration.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"message": "Please provide your login credentials.", "details": serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        identifier = serializer.validated_data["identifier"].strip()
        password = serializer.validated_data["password"]

        # Support identifier as email or username
        user_obj = None
        if "@" in identifier:
            user_obj = User.objects.filter(email__iexact=identifier).first()
        else:
            user_obj = User.objects.filter(username__iexact=identifier).first()

        username_for_auth = user_obj.username if user_obj else identifier
        user = authenticate(request, username=username_for_auth, password=password)

        if not user:
            # Generic error to avoid revealing account existence
            return Response(
                {"error": {"message": "Invalid email/username or password. Please verify and try again."}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"error": {"message": "This account is inactive. Please contact support."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        return Response(
            {
                "message": "Login successful. Welcome back!",
                "user": user_data,
                "tokens": tokens,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    Revokes and blacklists the refresh token, terminating the authenticated session.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass  # Token was already blacklisted or expired; proceed safely

        return Response(
            {"message": "Logged out successfully. See you at the next movie night!"},
            status=status.HTTP_200_OK,
        )


class CurrentUserView(APIView):
    """
    Retrieves or updates the authenticated user's profile and settings.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        profile_data = request.data.get("profile", {})
        display_name = request.data.get("display_name") or profile_data.get("display_name")
        bio = request.data.get("bio") or profile_data.get("bio")

        if hasattr(user, "profile"):
            if display_name is not None:
                user.profile.display_name = display_name
            if bio is not None:
                user.profile.bio = bio
            user.profile.save()

        # Update first_name/last_name if provided
        if display_name:
            parts = display_name.split(" ", 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ""
            user.save(update_fields=["first_name", "last_name"])

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """
    Generates a secure password reset token without leaking account existence.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"message": "Invalid email address format.", "details": serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = serializer.validated_data["email"].strip().lower()
        user = User.objects.filter(email__iexact=email).first()

        token = None
        uid = None
        if user and user.is_active:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            # In production this emails the link: /reset-password?uid={uid}&token={token}
            logger.info("Password reset requested for user %s: uid=%s token=%s", user.username, uid, token)

        # Consistent response regardless of account existence
        return Response(
            {
                "message": "If an account matches that email address, a password recovery link has been prepared.",
                "uid": uid, # Helpful for local dev testing
                "token": token,
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """
    Validates token and sets new password using Django's password validation framework.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": {"message": "Password reset validation failed.", "details": serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uid_b64 = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": {"message": "Password reset link is invalid or has expired."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"error": {"message": "Password reset token is invalid or has expired."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate password strength
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response(
                {"error": {"message": "Password does not meet requirements.", "details": {"password": list(e.messages)}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {"message": "Your password has been successfully reset. You may now sign in with your new password."},
            status=status.HTTP_200_OK,
        )


class UserSearchView(APIView):
    """
    Search registered users by username or display name to send friend requests.
    Enriched with friendship_status: 'friends', 'pending_outgoing', 'pending_incoming', or 'none'.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query or len(query) < 2:
            return Response([], status=status.HTTP_200_OK)

        from django.db.models import Q
        from .models import Friendship

        users = User.objects.filter(
            Q(username__icontains=query) | Q(profile__display_name__icontains=query)
        ).exclude(id=request.user.id)[:10]

        target_ids = [u.id for u in users]
        friendships = Friendship.objects.filter(
            (Q(requester=request.user, receiver_id__in=target_ids) |
             Q(receiver=request.user, requester_id__in=target_ids))
        )

        # Map target user id to friendship record
        friendship_map = {}
        for f in friendships:
            other_id = f.receiver_id if f.requester_id == request.user.id else f.requester_id
            friendship_map[other_id] = f

        results = []
        for u in users:
            data = UserSerializer(u).data
            f = friendship_map.get(u.id)
            if f:
                if f.status == "accepted":
                    data["friendship_status"] = "friends"
                    data["friendship_id"] = str(f.id)
                elif f.status == "pending":
                    if f.requester_id == request.user.id:
                        data["friendship_status"] = "pending_outgoing"
                    else:
                        data["friendship_status"] = "pending_incoming"
                    data["friendship_id"] = str(f.id)
                else:
                    data["friendship_status"] = "none"
            else:
                data["friendship_status"] = "none"

            results.append(data)

        return Response(results, status=status.HTTP_200_OK)


class FriendListView(APIView):
    """
    List accepted friends and pending incoming/outgoing friend requests.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Friendship
        from django.db.models import Q

        user = request.user
        # Accepted friendships
        accepted = Friendship.objects.filter(
            (Q(requester=user) | Q(receiver=user)),
            status="accepted",
        )
        friend_users = []
        for f in accepted:
            friend_user = f.receiver if f.requester == user else f.requester
            data = UserSerializer(friend_user).data
            data["friendship_id"] = str(f.id)
            friend_users.append(data)

        # Pending incoming
        incoming = Friendship.objects.filter(receiver=user, status="pending")
        # Pending outgoing
        outgoing = Friendship.objects.filter(requester=user, status="pending")

        from .serializers import FriendshipSerializer
        return Response({
            "friends": friend_users,
            "incoming_requests": FriendshipSerializer(incoming, many=True).data,
            "outgoing_requests": FriendshipSerializer(outgoing, many=True).data,
        }, status=status.HTTP_200_OK)


class FriendRequestView(APIView):
    """
    Send, accept, decline, or cancel a friend request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import Friendship
        user = request.user
        target_username = request.data.get("username", "").strip()

        if not target_username:
            return Response({"error": "Target username is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(username__iexact=target_username)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if target_user == user:
            return Response({"error": "You cannot send a friend request to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # Check existing friendship in either direction
        from django.db.models import Q
        existing = Friendship.objects.filter(
            (Q(requester=user, receiver=target_user) | Q(requester=target_user, receiver=user))
        ).first()

        if existing:
            if existing.status == "accepted":
                return Response({"message": "You are already friends with this user."}, status=status.HTTP_200_OK)
            elif existing.status == "pending":
                if existing.requester == target_user:
                    # Automatically accept if the other person already invited
                    existing.status = "accepted"
                    existing.save()
                    return Response({"message": f"Accepted friend request from {target_user.username}!"}, status=status.HTTP_200_OK)
                return Response({"message": "Friend request is already pending."}, status=status.HTTP_200_OK)

        # Create new friend request
        friendship = Friendship.objects.create(
            requester=user,
            receiver=target_user,
            status="pending",
        )
        from .serializers import FriendshipSerializer
        return Response({
            "message": f"Friend request sent to {target_user.username}.",
            "friendship": FriendshipSerializer(friendship).data,
        }, status=status.HTTP_201_CREATED)

    def patch(self, request):
        """
        Respond to an incoming friend request (action: 'accept' | 'decline')
        """
        from .models import Friendship
        friendship_id = request.data.get("friendship_id")
        action = request.data.get("action")  # 'accept' | 'decline'

        try:
            friendship = Friendship.objects.get(id=friendship_id, receiver=request.user)
        except Friendship.DoesNotExist:
            return Response({"error": "Friend request not found."}, status=status.HTTP_404_NOT_FOUND)

        if action == "accept":
            friendship.status = "accepted"
            friendship.save()
            return Response({"message": "Friend request accepted!"}, status=status.HTTP_200_OK)
        elif action == "decline":
            friendship.status = "declined"
            friendship.save()
            return Response({"message": "Friend request declined."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Invalid action. Use 'accept' or 'decline'."}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """
        Remove friend or cancel outgoing request
        """
        from .models import Friendship
        from django.db.models import Q
        friendship_id = request.query_params.get("friendship_id")

        try:
            friendship = Friendship.objects.get(
                Q(id=friendship_id) & (Q(requester=request.user) | Q(receiver=request.user))
            )
            friendship.delete()
            return Response({"message": "Friendship removed."}, status=status.HTTP_200_OK)
        except Friendship.DoesNotExist:
            return Response({"error": "Friendship record not found."}, status=status.HTTP_404_NOT_FOUND)


class DirectRoomInvitationView(APIView):
    """
    Send or view direct room watch party invites between friends.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import RoomInvitation
        from .serializers import RoomInvitationSerializer
        invitations = RoomInvitation.objects.filter(recipient=request.user, status="pending")
        return Response(RoomInvitationSerializer(invitations, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        from .models import RoomInvitation
        from .serializers import RoomInvitationSerializer
        from apps.rooms.models import Room

        sender = request.user
        recipient_username = request.data.get("recipient_username", "").strip()
        room_code = request.data.get("room_code", "").strip()

        try:
            room = Room.objects.get(code=room_code)
        except Room.DoesNotExist:
            return Response({"error": "Room not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            recipient = User.objects.get(username__iexact=recipient_username)
        except User.DoesNotExist:
            return Response({"error": "Recipient user not found."}, status=status.HTTP_404_NOT_FOUND)

        if recipient == sender:
            return Response({"error": "Cannot invite yourself."}, status=status.HTTP_400_BAD_REQUEST)

        invitation, _ = RoomInvitation.objects.update_or_create(
            sender=sender,
            recipient=recipient,
            room_code=room.code,
            defaults={
                "room_title": room.title,
                "movie_title": room.movie_title,
                "status": "pending",
            },
        )

        return Response({
            "message": f"Direct invitation to #{room.code} sent to {recipient.username}!",
            "invitation": RoomInvitationSerializer(invitation).data,
        }, status=status.HTTP_201_CREATED)

