from rest_framework.permissions import BasePermission


class IsMentor(BasePermission):
    """
    Only mentors can create courses.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "mentor"
        )


class IsOwnerOrReadOnly(BasePermission):
    """
    Only the course owner can edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True

        return obj.mentor == request.user

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "admin"
        )