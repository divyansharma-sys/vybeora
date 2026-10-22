"""
Common API views, including system health check.
"""
from datetime import datetime, timezone
from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
import channels.layers


class HealthCheckView(APIView):
    """
    Health check endpoint for monitoring system availability and infrastructure status.
    Accessible without authentication.
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        # 1. Database connectivity check
        db_status = "connected"
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
        except Exception as exc:
            db_status = f"unreachable: {str(exc)}"

        # 2. Channels Channel Layer check
        channel_status = "active"
        try:
            layer = channels.layers.get_channel_layer()
            if layer is None:
                channel_status = "unavailable"
        except Exception as exc:
            channel_status = f"error: {str(exc)}"

        is_healthy = db_status == "connected" and channel_status == "active"
        http_status = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

        response_payload = {
            "status": "healthy" if is_healthy else "degraded",
            "service": "vybeora-backend",
            "version": "1.0.0",
            "environment": "development" if settings.DEBUG else "production",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {
                "database": db_status,
                "channel_layer": channel_status,
            },
        }

        return Response(response_payload, status=http_status)
