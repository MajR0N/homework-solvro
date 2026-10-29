from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import ProtectedError
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.response import Response

from .filters import CocktailFilter, IngredientFilter
from .models import Category, Cocktail, Ingredient
from .pagination import Pagination
from .serializers import (
    CategorySerializer,
    CocktailDetailSerializer,
    CocktailListSerializer,
    CocktailWriteSerializer,
    IngredientSerializer,
)


# Odpowiedź po zapisie ma kształt szczegółów (z ingredients[]), a nie ciała żądania; bez tego Swagger pokazałby złą
@extend_schema_view(
    create=extend_schema(responses={201: CocktailDetailSerializer}),
    update=extend_schema(responses=CocktailDetailSerializer),
    partial_update=extend_schema(responses=CocktailDetailSerializer),
)
class CocktailViewSet(viewsets.ModelViewSet):
    """CRUD koktajli. Zapis jest na razie dostępny dla każdego (autoryzacja w kolejnym kroku)."""

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
        if self.action == "list":
            return CocktailListSerializer
        if self.action == "retrieve":
            return CocktailDetailSerializer
        return CocktailWriteSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Krótka lista (kilka pozycji), więc bez paginacji: frontend potrzebuje jej do filtra."""

    queryset = Category.objects.order_by("name")
    serializer_class = CategorySerializer
    pagination_class = None


@extend_schema_view(
    destroy=extend_schema(
        responses={204: None, 409: OpenApiResponse(description="Składnik jest użyty w koktajlu, więc nie można go usunąć.")}
    )
)
class IngredientViewSet(viewsets.ModelViewSet):
    """CRUD składników. Zapis jest na razie dostępny dla każdego (autoryzacja w kolejnym kroku)."""

    queryset = Ingredient.objects.order_by("name", "id")
    serializer_class = IngredientSerializer
    pagination_class = Pagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = IngredientFilter

    def destroy(self, request, *args, **kwargs):
        # PROTECT w modelu nie pozwala usunąć składnika użytego w koktajlu; odpowiadamy czytelnie, a nie błędem 500
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Ten składnik jest użyty w koktajlach, więc nie można go usunąć."},
                status=status.HTTP_409_CONFLICT,
            )
