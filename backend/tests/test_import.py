import pytest
from django.core.management import call_command

from cocktails.management.commands import import_solvro
from cocktails.models import Category, Cocktail, CocktailIngredient, Ingredient

LIME = {"id": 312, "name": "Lime", "description": None, "alcohol": False, "type": "Fruit", "percentage": None, "imageUrl": None}
MINT = {"id": 337, "name": "Mint", "description": "Herb", "alcohol": False, "type": None, "percentage": None, "imageUrl": None}
RUM = {"id": 5, "name": "Light rum", "description": "Rum", "alcohol": True, "type": "Rum", "percentage": 40, "imageUrl": "https://x/rum.png"}
MOJITO = {"id": 11000, "name": "Mojito", "category": "Cocktail", "glass": "Highball glass", "instructions": "Muddle.", "imageUrl": None, "alcoholic": True}
SHOT = {"id": 12000, "name": "Salt Shot", "category": "Shot", "glass": "Shot glass", "instructions": "Drink.", "imageUrl": None, "alcoholic": False}
DETAILS = {
    11000: {**MOJITO, "ingredients": [{**LIME, "measure": "Juice of 1 "}, {**MINT, "measure": "2-4 "}, {**RUM, "measure": "2 oz"}]},
    12000: {**SHOT, "ingredients": [LIME]},  # prawdziwe dane mają czasem składnik bez klucza "measure"
}


def fake_get(path):
    if path.startswith("/ingredients"):
        return {"data": [LIME, MINT, RUM]}
    if path.startswith("/cocktails?"):
        return {"data": [MOJITO, SHOT]}
    return {"data": DETAILS[int(path.rsplit("/", 1)[1])]}


@pytest.fixture
def fake_api(monkeypatch):
    monkeypatch.setattr(import_solvro, "get", fake_get)


def counts():
    return Cocktail.objects.count(), Ingredient.objects.count(), CocktailIngredient.objects.count(), Category.objects.count()


# --- test na atrapie: sprawdza NASZĄ logikę, działa bez internetu ---


def test_import_keeps_solvro_ids_and_handles_missing_measure(db, fake_api):
    call_command("import_solvro")
    assert counts() == (2, 3, 4, 2)
    assert Cocktail.objects.get(id=11000).name == "Mojito"
    assert CocktailIngredient.objects.get(cocktail_id=12000).measure == ""
    assert Ingredient.objects.get(id=5).percentage == 40


def test_import_twice_changes_nothing_and_restores_edits(db, fake_api):
    call_command("import_solvro")
    Cocktail.objects.filter(id=11000).update(name="Edited")
    call_command("import_solvro")
    assert counts() == (2, 3, 4, 2)
    assert Cocktail.objects.get(id=11000).name == "Mojito"


def test_imported_cocktails_are_verified_but_reimport_keeps_an_admins_decision(db, fake_api):
    call_command("import_solvro")
    assert Cocktail.objects.filter(verified=True).count() == 2
    Cocktail.objects.filter(id=11000).update(verified=False)  # admin zdjął znaczek w CMS
    call_command("import_solvro")
    assert Cocktail.objects.get(id=11000).verified is False


def test_new_rows_after_import_get_ids_above_imported_ones(db, fake_api):
    call_command("import_solvro")
    category = Category.objects.first()
    assert Cocktail.objects.create(name="New", category=category).id > 12000
    assert Ingredient.objects.create(name="New").id > 337


def test_failure_halfway_leaves_the_database_empty(db, monkeypatch):
    def broken_get(path):
        if path == "/cocktails/12000":
            raise ConnectionError("API padło")
        return fake_get(path)

    monkeypatch.setattr(import_solvro, "get", broken_get)
    with pytest.raises(ConnectionError):
        call_command("import_solvro")
    assert counts() == (0, 0, 0, 0)


# --- test na prawdziwym API: sprawdza, czy dane Solvro nadal mają kształt, jakiego oczekuje import ---


@pytest.mark.network
def test_real_solvro_api_still_matches_what_the_importer_expects(db):
    call_command("import_solvro")
    assert Cocktail.objects.count() >= 100
    assert Ingredient.objects.count() >= 100
    mojito = Cocktail.objects.get(id=11000)
    assert mojito.name == "Mojito" and mojito.links.count() >= 3
    assert Cocktail.objects.filter(links__isnull=False).distinct().count() > 100
