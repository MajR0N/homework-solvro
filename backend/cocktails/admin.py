from django.contrib import admin
from django.db.models import Count

from accounts.admin import RoleAdminMixin

from .models import Category, Cocktail, CocktailIngredient, Ingredient, Review, ReviewReport

admin.site.site_header = "Koktajle CMS"
admin.site.site_title = "Koktajle CMS"


class AuthorOnAddMixin:
    """Wpis dodany w CMS dostaje autora z zalogowanego konta, tak jak przez API."""

    readonly_fields = ("author", "author_name")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.author, obj.author_name = request.user, request.user.username
        super().save_model(request, obj, form, change)


@admin.register(Category)
class CategoryAdmin(RoleAdminMixin, admin.ModelAdmin):
    search_fields = ("name",)


@admin.register(Ingredient)
class IngredientAdmin(RoleAdminMixin, AuthorOnAddMixin, admin.ModelAdmin):
    list_display = ("name", "type", "alcoholic", "author_name")
    list_filter = ("alcoholic", "type")
    search_fields = ("name",)  # potrzebne też do wyszukiwarki składników w koktajlu (autocomplete)


class CocktailIngredientInline(RoleAdminMixin, admin.TabularInline):
    model = CocktailIngredient
    extra = 1
    autocomplete_fields = ("ingredient",)


@admin.register(Cocktail)
class CocktailAdmin(RoleAdminMixin, AuthorOnAddMixin, admin.ModelAdmin):
    list_display = ("name", "category", "alcoholic", "verified", "author_name")
    list_filter = ("verified", "category", "alcoholic")
    search_fields = ("name",)
    inlines = [CocktailIngredientInline]
    actions = ["mark_verified", "mark_unverified"]

    @admin.action(description="Mark selected cocktails as verified")
    def mark_verified(self, request, queryset):
        self.message_user(request, f"Verified: {queryset.update(verified=True)}")

    @admin.action(description="Remove the verified mark from selected cocktails")
    def mark_unverified(self, request, queryset):
        self.message_user(request, f"Unverified: {queryset.update(verified=False)}")


@admin.register(Review)
class ReviewAdmin(RoleAdminMixin, admin.ModelAdmin):
    """Admin przegląda i usuwa opinie, ale nie przepisuje cudzych słów (stąd brak edycji i dodawania)."""

    list_display = ("cocktail", "rating", "author", "report_count", "created_at")
    list_filter = ("rating",)
    ordering = ("-created_at",)  # kolumna Reports sortuje po liczbie zgłoszeń (kliknij nagłówek)
    search_fields = ("text", "cocktail__name", "author__username")
    readonly_fields = ("cocktail", "author", "rating", "text", "created_at", "updated_at")

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_reports=Count("reports"))

    @admin.display(ordering="_reports", description="Reports")
    def report_count(self, review):
        return review._reports


@admin.register(ReviewReport)
class ReviewReportAdmin(RoleAdminMixin, admin.ModelAdmin):
    """Rozpatrzenie zgłoszenia: usuń opinię (Reviews) albo samo zgłoszenie (odrzucenie)."""

    list_display = ("review", "reporter", "reason", "created_at")
    readonly_fields = ("review", "reporter", "reason", "created_at")

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
