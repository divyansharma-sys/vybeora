"""
Development settings for Vybeora backend.
Enables debugging, local SQLite database, and fallback in-memory channel layer.
"""
import os
from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

# CORS settings for development frontend
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Database
# Default: SQLite for effortless local setup without mandatory external services
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Real-time Channels Channel Layer
# Uses Redis if configured; otherwise gracefully falls back to InMemoryChannelLayer
REDIS_URL = os.getenv("REDIS_URL", "").strip()

if REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }
