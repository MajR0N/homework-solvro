import django_filters

from .models import Cocktail


class IdInFilter(django_filters.BaseInFilter, django_filters.NumberFilter):
    """?id=1,2,3 -> tylko te koktajle (do ulubionych)."""


class CocktailFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    category = django_filters.CharFilter(field_name="category__name")  # po nazwie, nie po id
    glass = django_filters.CharFilter(field_name="glass")
    # BooleanFilter po cichu ignoruje nieznane wartości (?alcoholic=maybe), więc wybieramy z listy: reszta to 400
    alcoholic = django_filters.TypedChoiceFilter(
        choices=[("true", "true"), ("false", "false")], coerce=lambda v: v == "true"
    )
    id = IdInFilter(field_name="id", lookup_expr="in")
    # Niedozwolona wartość (np. ?ordering=glass) daje 400, a nie po cichu ignorowane sortowanie.
    ordering = django_filters.OrderingFilter(fields=("name", "id"))

    class Meta:
        model = Cocktail
        fields = []

    def filter_queryset(self, queryset):
        # Samo ?id= (puste) znaczy "żadne", a nie "wszystkie" - inaczej pusta lista ulubionych zwróciłaby całą bazę.
        if self.data.get("id") == "":
            return queryset.none()
        qs = super().filter_queryset(queryset)
        # id na końcu sortowania: bez tego koktajle o tej samej nazwie mogłyby przeskakiwać między stronami.
        return qs.order_by(*qs.query.order_by, "id")
