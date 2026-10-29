import django_filters
from django.db.models import Exists, OuterRef

from .models import Cocktail, CocktailIngredient, Ingredient


class IdInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    """?id=1,2,3 -> tylko te koktajle (do ulubionych)."""


def true_false_filter():
    # BooleanFilter po cichu ignoruje nieznane wartości (?alcoholic=maybe), więc wybieramy z listy: reszta to 400
    return django_filters.TypedChoiceFilter(
        choices=[("true", "true"), ("false", "false")],
        coerce=lambda v: v == "true",
        help_text="Tylko true lub false; inna wartość daje 400.",
    )


class StableOrderFilterSet(django_filters.FilterSet):
    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        # id na końcu sortowania: bez tego rekordy o tej samej nazwie mogłyby przeskakiwać między stronami.
        return qs.order_by(*qs.query.order_by, "id")


class IngredientFilter(StableOrderFilterSet):
    search = django_filters.CharFilter(field_name="name", lookup_expr="icontains", help_text="Fragment nazwy, bez rozróżniania wielkości liter.")
    type = django_filters.CharFilter(field_name="type", help_text="Dokładny typ składnika, np. Fruit.")
    alcoholic = true_false_filter()
    # Niedozwolona wartość (np. ?ordering=type) daje 400, a nie po cichu ignorowane sortowanie.
    ordering = django_filters.OrderingFilter(fields=("name", "id"), help_text="Sortowanie; minus oznacza malejąco. Przy remisie decyduje id.")

    class Meta:
        model = Ingredient
        fields = []


class CocktailFilter(StableOrderFilterSet):
    search = django_filters.CharFilter(field_name="name", lookup_expr="icontains", help_text="Fragment nazwy, bez rozróżniania wielkości liter.")
    category = django_filters.CharFilter(field_name="category__name", help_text="Dokładna nazwa kategorii, np. Shot.")  # po nazwie, nie po id
    glass = django_filters.CharFilter(field_name="glass", help_text="Dokładna nazwa szklanki, np. Jar.")
    author = django_filters.CharFilter(field_name="author__username", lookup_expr="iexact", help_text="Nazwa użytkownika, który dodał koktajl (istniejące konto).")
    alcoholic = true_false_filter()
    verified = true_false_filter()
    ingredient = django_filters.CharFilter(method="filter_ingredient", help_text="Fragment nazwy składnika; po przecinku koktajl musi mieć wszystkie, np. mint,lime.")
    id = IdInFilter(field_name="id", lookup_expr="in", help_text="Tylko te koktajle (id po przecinku); puste ?id= daje brak wyników.")
    ordering = django_filters.OrderingFilter(fields=("name", "id", "verified"), help_text="Sortowanie; minus oznacza malejąco. Przy remisie decyduje id.")

    class Meta:
        model = Cocktail
        fields = []

    def filter_ingredient(self, queryset, name, value):
        # ?ingredient=mint,lime -> koktajl musi mieć OBA. Exists zamiast join, żeby koktajl nie pojawił się
        # dwa razy, gdy pasują mu dwa składniki naraz (np. "Lime" i "Lime juice").
        for term in filter(None, (t.strip() for t in value.split(","))):
            has_term = CocktailIngredient.objects.filter(cocktail=OuterRef("pk"), ingredient__name__icontains=term)
            queryset = queryset.filter(Exists(has_term))
        return queryset

    def filter_queryset(self, queryset):
        # Samo ?id= (puste) znaczy "żadne", a nie "wszystkie" - inaczej pusta lista ulubionych zwróciłaby całą bazę.
        if self.data.get("id") == "":
            return queryset.none()
        return super().filter_queryset(queryset)
