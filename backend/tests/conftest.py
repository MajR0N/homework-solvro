from types import SimpleNamespace

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from accounts.models import User
from cocktails.models import Category, Cocktail, CocktailIngredient, Ingredient


@pytest.fixture(autouse=True)
def fast_password_hashing(settings):
    # Django celowo hashuje hasła powoli; w testach to tylko strata czasu (produkcja zostaje bez zmian)
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]


@pytest.fixture(autouse=True)
def clear_throttle_counters():
    cache.clear()  # liczniki limitów żyją w pamięci i inaczej przenosiłyby się między testami


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def make_user(db):
    def make(username, role="user"):
        return User.objects.create_user(username, password="Sup3r-secret-pw", role=role)

    return make


def logged_in(user):
    client = APIClient()
    client.force_authenticate(user)  # pomija sam token JWT; jego działanie sprawdza test_accounts.py
    return client


@pytest.fixture
def as_user():
    return logged_in


@pytest.fixture
def user_api(make_user):
    return logged_in(make_user("anna"))


@pytest.fixture
def admin_api(make_user):
    return logged_in(make_user("adam", role="admin"))


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
