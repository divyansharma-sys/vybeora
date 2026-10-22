"""
Common reusable permission classes for Vybeora API.
"""
from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission allowing read access to anyone,
    but write/delete access only to the owner of the object.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner = getattr(obj, "user", getattr(obj, "host", getattr(obj, "created_by", None)))
        return owner == request.user
