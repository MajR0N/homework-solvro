from django.contrib import admin

from accounts.admin import RoleAdminMixin

from .models import Category, Cocktail, CocktailIngredient, Ingredient

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
    list_display = ("name", "category", "alcoholic", "author_name")
    list_filter = ("category", "alcoholic")
    search_fields = ("name",)
    inlines = [CocktailIngredientInline]
