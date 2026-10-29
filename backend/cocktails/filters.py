import django_filters
from django.db.models import Exists, OuterRef

from .models import Cocktail, CocktailIngredient, Ingredient


class IdInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    """?id=1,2,3 -> tylko te koktajle (do ulubionych)."""


def alcoholic_filter():
    # BooleanFilter po cichu ignoruje nieznane wartości (?alcoholic=maybe), więc wybieramy z listy: reszta to 400
    return django_filters.TypedChoiceFilter(choices=[("true", "true"), ("false", "false")], coerce=lambda v: v == "true")


class StableOrderFilterSet(django_filters.FilterSet):
    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        # id na końcu sortowania: bez tego rekordy o tej samej nazwie mogłyby przeskakiwać między stronami.
        return qs.order_by(*qs.query.order_by, "id")


class IngredientFilter(StableOrderFilterSet):
    search = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    type = django_filters.CharFilter(field_name="type")
    alcoholic = alcoholic_filter()
    # Niedozwolona wartość (np. ?ordering=type) daje 400, a nie po cichu ignorowane sortowanie.
    ordering = django_filters.OrderingFilter(fields=("name", "id"))

    class Meta:
        model = Ingredient
        fields = []


class CocktailFilter(StableOrderFilterSet):
    search = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    category = django_filters.CharFilter(field_name="category__name")  # po nazwie, nie po id
    glass = django_filters.CharFilter(field_name="glass")
    alcoholic = alcoholic_filter()
    ingredient = django_filters.CharFilter(method="filter_ingredient")
    id = IdInFilter(field_name="id", lookup_expr="in")
    ordering = django_filters.OrderingFilter(fields=("name", "id"))

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
