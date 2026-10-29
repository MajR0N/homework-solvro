from rest_framework import serializers

from .models import Category, Cocktail, CocktailIngredient, Ingredient


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ["id", "name", "description", "alcoholic", "type", "percentage", "image_url"]


class CocktailIngredientSerializer(serializers.ModelSerializer):
    """Jeden element listy ingredients[]: pola składnika + ilość z tabeli pośredniej."""

    class Meta:
        model = CocktailIngredient
        fields = ["measure"]

    def to_representation(self, link):
        return {**IngredientSerializer(link.ingredient).data, "measure": link.measure}


class CocktailListSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name")

    class Meta:
        model = Cocktail
        fields = ["id", "name", "category", "glass", "alcoholic", "image_url"]


class CocktailDetailSerializer(CocktailListSerializer):
    ingredients = CocktailIngredientSerializer(source="links", many=True)

    class Meta(CocktailListSerializer.Meta):
        fields = CocktailListSerializer.Meta.fields + ["instructions", "ingredients"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]
