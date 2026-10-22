import re
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "display_name",
            "bio",
            "avatar_url",
            "parties_attended",
            "rooms_hosted",
            "created_at",
        ]
        read_only_fields = ["id", "parties_attended", "rooms_hosted", "created_at"]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "profile",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined"]

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.username


class SignupSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=True, trim_whitespace=True)
    username = serializers.CharField(max_length=150, required=False, allow_blank=True, trim_whitespace=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    confirm_password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})
    agree_terms = serializers.BooleanField(required=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized

    def validate_agree_terms(self, value):
        if not value:
            raise serializers.ValidationError("You must accept the Terms of Service and Privacy Policy to continue.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        confirm_password = attrs.get("confirm_password")

        if password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Generate or validate username
        username = attrs.get("username", "").strip()
        email = attrs.get("email", "").strip()
        if not username:
            # Derive username from email prefix with sanitation
            base_name = re.sub(r"[^a-zA-Z0-9_]", "", email.split("@")[0]) or "user"
            candidate = base_name
            count = 1
            while User.objects.filter(username__iexact=candidate).exists():
                candidate = f"{base_name}_{count}"
                count += 1
            username = candidate
        else:
            if User.objects.filter(username__iexact=username).exists():
                raise serializers.ValidationError({"username": "This username is already taken. Please choose another."})
        attrs["username"] = username

        # Enforce Django password validators
        temp_user = User(username=username, email=email)
        try:
            validate_password(password, user=temp_user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return attrs

    def create(self, validated_data):
        full_name = validated_data.get("full_name", "").strip()
        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first_name,
            last_name=last_name,
        )

        # Update profile display_name
        if hasattr(user, "profile"):
            user.profile.display_name = full_name or user.username
            user.profile.save()

        return user


class LoginSerializer(serializers.Serializer):
    """
    Accepts identifier (email or username) and password.
    """
    identifier = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True, style={"input_type": "password"})


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs.get("new_password") != attrs.get("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


class FriendshipSerializer(serializers.ModelSerializer):
    requester = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)

    class Meta:
        from .models import Friendship
        model = Friendship
        fields = ["id", "requester", "receiver", "status", "created_at", "updated_at"]


class RoomInvitationSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)

    class Meta:
        from .models import RoomInvitation
        model = RoomInvitation
        fields = ["id", "room_code", "room_title", "movie_title", "sender", "recipient", "status", "created_at"]
