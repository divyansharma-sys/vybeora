from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    SignupView,
    LoginView,
    LogoutView,
    CurrentUserView,
    ForgotPasswordView,
    ResetPasswordView,
    FriendListView,
    UserSearchView,
    FriendRequestView,
    DirectRoomInvitationView,
)

app_name = "users"

urlpatterns = [
    # Core Authentication Endpoints
    path("signup/", SignupView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot_password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset_password"),
    # Social & Friends Endpoints
    path("friends/", FriendListView.as_view(), name="friends_list"),
    path("friends/search/", UserSearchView.as_view(), name="user_search"),
    path("friends/request/", FriendRequestView.as_view(), name="friend_request"),
    path("invitations/", DirectRoomInvitationView.as_view(), name="room_invitations"),
]
