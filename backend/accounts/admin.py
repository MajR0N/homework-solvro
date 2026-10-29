from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.contrib.auth.models import Group

from .models import RANK, Role, User


admin.site.unregister(Group)  # role zastępują grupy Django, więc nie pokazujemy ich w CMS


class RoleAdminMixin:
    """CMS jest dla admin, staff i owner. Zamiast uprawnień Django (grupy, per-model) decyduje sama rola."""

    def _is_admin_level(self, request):
        return request.user.is_active and request.user.rank >= RANK[Role.ADMIN]

    def has_module_permission(self, request):
        return self._is_admin_level(request)

    def has_view_permission(self, request, obj=None):
        return self._is_admin_level(request)

    def has_add_permission(self, request, obj=None):
        return self._is_admin_level(request)

    def has_change_permission(self, request, obj=None):
        return self._is_admin_level(request)

    def has_delete_permission(self, request, obj=None):
        return self._is_admin_level(request)


class UserAddForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "role")


class UserEditForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(RoleAdminMixin, DjangoUserAdmin):
    add_form = UserAddForm
    form = UserEditForm
    list_display = ("username", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active")
    search_fields = ("username",)
    ordering = ("username",)
    # Bez is_staff, is_superuser, grup i uprawnień: te flagi wynikają z roli (patrz accounts/models.py).
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Role", {"fields": ("role", "is_active")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("username", "password1", "password2", "role")}),)

    def _manages(self, request, obj):
        # Zarządzać można tylko kontami o niższej randze niż własna (siebie i równych sobie nie).
        return obj is None or obj.rank < request.user.rank

    def has_change_permission(self, request, obj=None):
        return super().has_change_permission(request, obj) and self._manages(request, obj)

    def has_delete_permission(self, request, obj=None):
        return super().has_delete_permission(request, obj) and self._manages(request, obj)

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if db_field.name == "role":
            # Nadać można tylko rolę niższą od własnej, więc nikt nie awansuje siebie ani nikogo na swój poziom.
            kwargs["choices"] = [(value, label) for value, label in Role.choices if RANK[value] < request.user.rank]
        return super().formfield_for_choice_field(db_field, request, **kwargs)
