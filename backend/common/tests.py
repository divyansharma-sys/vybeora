from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


class HealthCheckTests(TestCase):
    """
    Tests for the system health check diagnostic endpoint.
    """

    def setUp(self):
        self.client = APIClient()

    def test_health_check_returns_200_ok(self):
        """Verify the health check endpoint returns 200 OK and valid diagnostic keys."""
        url = reverse("common:health-check")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("status"), "healthy")
        self.assertEqual(response.data.get("service"), "vybeora-backend")
        self.assertIn("checks", response.data)
        self.assertEqual(response.data["checks"].get("database"), "connected")
        self.assertEqual(response.data["checks"].get("channel_layer"), "active")
