from types import SimpleNamespace

import pytest
from rest_framework.test import APIClient

from cocktails.models import Category, Cocktail, CocktailIngredient, Ingredient


@pytest.fixture
def api():
    return APIClient()


def make_cocktail(name, category, ingredients, alcoholic):
    cocktail = Cocktail.objects.create(name=name, category=category, alcoholic=alcoholic, glass="Highball glass")
    for ingredient, measure in ingredients:
        CocktailIngredient.objects.create(cocktail=cocktail, ingredient=ingredient, measure=measure)
    return cocktail


@pytest.fixture
def data(db):
    """Mały zestaw: Mojito ma jednocześnie "Lime" i "Lime juice" (test duplikatów przy filtrze składnika)."""
    cocktail_cat = Category.objects.create(name="Cocktail")
    shot_cat = Category.objects.create(name="Shot")
    lime = Ingredient.objects.create(name="Lime", type="Fruit")
    lime_juice = Ingredient.objects.create(name="Lime juice", type="Juice")
    mint = Ingredient.objects.create(name="Mint", type="Herb")
    rum = Ingredient.objects.create(name="Light rum", type="Rum", alcoholic=True, percentage=40)
    unused = Ingredient.objects.create(name="Unused syrup")
    mojito = make_cocktail("Mojito", cocktail_cat, [(lime, "1"), (lime_juice, "2 tsp"), (mint, "3"), (rum, "2 oz")], True)
    virgin = make_cocktail("Virgin Mojito", cocktail_cat, [(lime, "1"), (mint, "3")], False)
    shot = make_cocktail("Lemon Shot", shot_cat, [(lime, "")], True)
    return SimpleNamespace(
        cocktail_cat=cocktail_cat, shot_cat=shot_cat, lime=lime, lime_juice=lime_juice, mint=mint, rum=rum,
        unused=unused, mojito=mojito, virgin=virgin, shot=shot,
    )
