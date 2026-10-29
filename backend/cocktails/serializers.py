from django.db import transaction
from rest_framework import serializers

from .models import Category, Cocktail, CocktailIngredient, Ingredient, Review, ReviewReport


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ["id", "name", "description", "alcoholic", "type", "percentage", "image_url", "author", "author_name"]
        read_only_fields = ["author", "author_name"]  # ustawia serwer z konta w tokenie, klient nie może ich podać
        extra_kwargs = {"percentage": {"min_value": 0, "max_value": 100}}  # zawartość alkoholu w %


class CocktailIngredientSerializer(serializers.ModelSerializer):
    """Jeden element listy ingredients[]: pola składnika + ilość z tabeli pośredniej."""

    class Meta:
        model = CocktailIngredient
        fields = ["measure"]

    def to_representation(self, link):
        return {**IngredientSerializer(link.ingredient).data, "measure": link.measure}


class CocktailListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name")
    rating_avg = serializers.SerializerMethodField()  # None, gdy nie ma jeszcze opinii
    rating_count = serializers.IntegerField(read_only=True)

    def get_rating_avg(self, cocktail) -> float | None:
        return None if cocktail.rating_avg is None else round(float(cocktail.rating_avg), 2)

    class Meta:
        model = Cocktail
        fields = [
            "id", "name", "category", "glass", "alcoholic", "image_url", "verified", "rating_avg", "rating_count",
            "author", "author_name",
        ]


class CocktailDetailSerializer(CocktailListSerializer):
    ingredients = CocktailIngredientSerializer(source="links", many=True)

    class Meta(CocktailListSerializer.Meta):
        fields = CocktailListSerializer.Meta.fields + ["instructions", "ingredients"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class IngredientAmountSerializer(serializers.Serializer):
    """Wiersz listy ingredients[] przy zapisie: id składnika + ilość."""

    ingredient = serializers.PrimaryKeyRelatedField(queryset=Ingredient.objects.all())
    measure = serializers.CharField(max_length=200, allow_blank=True, required=False, default="")


class CocktailWriteSerializer(serializers.ModelSerializer):
    # kategoria po nazwie (jak przy odczycie); nieznana nazwa = 400, nie tworzymy kategorii "przy okazji"
    category = serializers.SlugRelatedField(slug_field="name", queryset=Category.objects.all())
    ingredients = IngredientAmountSerializer(many=True, required=False)

    class Meta:
        model = Cocktail
        fields = ["id", "name", "category", "glass", "alcoholic", "image_url", "instructions", "ingredients"]

    def validate_ingredients(self, rows):
        ids = [row["ingredient"].id for row in rows]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Ten sam składnik występuje więcej niż raz.")
        return rows

    def _set_ingredients(self, cocktail, rows):
        # zawsze zastępujemy całą listę, tak jak import (patrz README)
        cocktail.links.all().delete()
        CocktailIngredient.objects.bulk_create(
            CocktailIngredient(cocktail=cocktail, ingredient=r["ingredient"], measure=r["measure"]) for r in rows
        )

    @transaction.atomic  # koktajl i jego składniki zapisują się razem albo wcale
    def create(self, validated_data):
        rows = validated_data.pop("ingredients", [])
        cocktail = super().create(validated_data)
        self._set_ingredients(cocktail, rows)
        return cocktail

    @transaction.atomic
    def update(self, instance, validated_data):
        rows = validated_data.pop("ingredients", None)  # None = pole nie zostało wysłane, lista bez zmian
        cocktail = super().update(instance, validated_data)
        if rows is not None:
            self._set_ingredients(cocktail, rows)
        return cocktail

    def to_representation(self, instance):
        # odpowiedź po zapisie wygląda tak samo jak GET /cocktails/{id}/ (z policzonymi ocenami)
        instance = Cocktail.objects.with_ratings().get(pk=instance.pk)
        return CocktailDetailSerializer(instance, context=self.context).data


class ReviewSerializer(serializers.ModelSerializer):
    author_username = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "cocktail", "author", "author_username", "rating", "text", "created_at", "updated_at"]
        read_only_fields = ["cocktail", "author", "created_at", "updated_at"]
        extra_kwargs = {"text": {"max_length": 2000}}

    def get_author_username(self, review) -> str | None:
        return review.author.username if review.author_id else None  # None = usunięty użytkownik


class ReviewReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewReport
        fields = ["reason"]
