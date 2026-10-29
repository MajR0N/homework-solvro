from rest_framework.permissions import SAFE_METHODS, BasePermission

from accounts.models import RANK, Role


class IsAuthorOrAdmin(BasePermission):
    """Czytać może każdy; dodawać zalogowany; zmieniać i usuwać autor albo admin, staff i owner."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        is_author = obj.author_id is not None and obj.author_id == request.user.id
        return is_author or request.user.rank >= RANK[Role.ADMIN]  # dane z importu (bez autora): tylko admin wzwyż
