from django_filters.rest_framework import DjangoFilterBackend
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import generics, status, viewsets
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import CocktailFilter, IngredientFilter
from .models import Category, Cocktail, Ingredient, Review, ReviewReport
from .pagination import Pagination
from .permissions import IsAuthorOrAdmin, ReviewPermission
from .serializers import (
    CategorySerializer,
    CocktailDetailSerializer,
    CocktailListSerializer,
    CocktailWriteSerializer,
    IngredientSerializer,
    ReviewReportSerializer,
    ReviewSerializer,
)


class AuthorOnCreateMixin:
    """Autora ustawia serwer z zalogowanego konta; kopia nazwy zostaje, gdy konto zostanie usunięte."""

    permission_classes = [IsAuthorOrAdmin]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user, author_name=self.request.user.username)


# Odpowiedź po zapisie ma kształt szczegółów (z ingredients[]), a nie ciała żądania; bez tego Swagger pokazałby złą
@extend_schema_view(
    create=extend_schema(responses={201: CocktailDetailSerializer}),
    update=extend_schema(responses=CocktailDetailSerializer),
    partial_update=extend_schema(responses=CocktailDetailSerializer),
)
class CocktailViewSet(AuthorOnCreateMixin, viewsets.ModelViewSet):
    """CRUD koktajli: czytanie dla wszystkich, dodawanie po zalogowaniu, zmiany tylko autor lub admin wzwyż."""

    pagination_class = Pagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = CocktailFilter

    def get_queryset(self):
        # order_by jest konieczne: bez stałej kolejności paginacja mogłaby powtarzać lub gubić wiersze
        qs = Cocktail.objects.with_ratings().select_related("category").order_by("name", "id")
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
class IngredientViewSet(AuthorOnCreateMixin, viewsets.ModelViewSet):
    """CRUD składników, te same zasady co przy koktajlach."""

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


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Konflikt z istniejącymi danymi."


class CocktailReviews(generics.ListCreateAPIView):
    """GET: opinie o koktajlu (najnowsze pierwsze). POST: dodaj swoją (jedna na koktajl, nie o własnym koktajlu)."""

    serializer_class = ReviewSerializer
    pagination_class = Pagination
    permission_classes = [ReviewPermission]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):  # generator dokumentacji nie ma adresu z id
            return Review.objects.none()
        return Review.objects.filter(cocktail_id=self.kwargs["cocktail_id"]).select_related("author").order_by("-created_at", "-id")

    def list(self, request, *args, **kwargs):
        get_object_or_404(Cocktail, pk=kwargs["cocktail_id"])  # nieistniejący koktajl to 404, nie pusta lista
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        cocktail = get_object_or_404(Cocktail, pk=self.kwargs["cocktail_id"])
        user = self.request.user
        if cocktail.author_id == user.id:
            raise PermissionDenied("Nie możesz ocenić własnego koktajlu.")
        try:
            with transaction.atomic():
                serializer.save(cocktail=cocktail, author=user)
        except IntegrityError:  # też przy dwóch jednoczesnych żądaniach: pilnuje tego baza
            raise Conflict("Już dodałeś opinię o tym koktajlu. Możesz ją edytować.")


class ReviewDetail(generics.RetrieveUpdateDestroyAPIView):
    """Autor zmienia i usuwa swoją opinię; admin, staff i owner mogą ją usunąć."""

    queryset = Review.objects.select_related("author")
    serializer_class = ReviewSerializer
    permission_classes = [ReviewPermission]


class ReviewReportCreate(generics.CreateAPIView):
    """Zgłoś opinię adminowi. Powtórne zgłoszenie tej samej opinii przez tę samą osobę niczego nie dubluje (200)."""

    serializer_class = ReviewReportSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        review = get_object_or_404(Review, pk=kwargs["pk"])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report, created = ReviewReport.objects.get_or_create(
            review=review, reporter=request.user, defaults={"reason": serializer.validated_data.get("reason", "")}
        )
        return Response({"reason": report.reason}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
