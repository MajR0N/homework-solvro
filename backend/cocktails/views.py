from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from .filters import CocktailFilter
from .models import Category, Cocktail
from .serializers import CategorySerializer, CocktailDetailSerializer, CocktailListSerializer


class Pagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"  # ?page_size=50
    max_page_size = 100  # górny limit, żeby nikt nie poprosił o całą bazę naraz


class CocktailViewSet(viewsets.ReadOnlyModelViewSet):
    """Lista (GET /cocktails/) i szczegóły (GET /cocktails/{id}/). Na razie tylko odczyt."""

    pagination_class = Pagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = CocktailFilter

    def get_queryset(self):
        # order_by jest konieczne: bez stałej kolejności paginacja mogłaby powtarzać lub gubić wiersze
        qs = Cocktail.objects.select_related("category").order_by("name", "id")
        if self.action == "retrieve":
            qs = qs.prefetch_related("links__ingredient")
        return qs

    def get_serializer_class(self):
        return CocktailDetailSerializer if self.action == "retrieve" else CocktailListSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Krótka lista (kilka pozycji), więc bez paginacji: frontend potrzebuje jej do filtra."""

    queryset = Category.objects.order_by("name")
    serializer_class = CategorySerializer
    pagination_class = None
