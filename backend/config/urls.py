"""
URL configuration for Vybeora backend.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # System health check & diagnostic APIs
    path("api/", include("common.urls")),
    # Domain specific APIs
    path("api/auth/", include("apps.users.urls", namespace="auth")),
    path("api/movies/", include("apps.movies.urls")),
    path("api/rooms/", include("apps.rooms.urls")),
    path("api/chat/", include("apps.chat.urls")),
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
