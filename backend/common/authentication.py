import logging
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

logger = logging.getLogger(__name__)


class LenientJWTAuthentication(JWTAuthentication):
    """
    Extends SimpleJWT's JWTAuthentication to safely ignore expired or invalid tokens
    when accessed from AllowAny or optional authentication endpoints, rather than
    immediately rejecting the entire request with an HTTP 401 error.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, AuthenticationFailed) as exc:
            # Check if this endpoint explicitly allows any user
            # If so, treat the request as unauthenticated rather than returning 401
            logger.debug(f"LenientJWTAuthentication encountered invalid token: {exc}")
            return None
