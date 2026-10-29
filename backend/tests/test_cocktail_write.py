import pytest

from cocktails.models import Cocktail, CocktailIngredient, Ingredient

URL = "/api/v1/cocktails/"


def payload(data, **overrides):
    body = {
        "name": "  Test Drink  ",
        "category": "Cocktail",
        "glass": "Tumbler",
        "alcoholic": False,
        "instructions": "Stir.",
        "ingredients": [{"ingredient": data.lime.id, "measure": "2 oz"}, {"ingredient": data.mint.id}],
    }
    return {**body, **overrides}


def measures(response_json):
    return {i["name"]: i["measure"] for i in response_json["ingredients"]}


def test_create_returns_detail_shape_and_trims_name(user_api, data):
    response = user_api.post(URL, payload(data), format="json")
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Test Drink" and body["category"] == "Cocktail"
    assert measures(body) == {"Lime": "2 oz", "Mint": ""}
    assert user_api.get(f"{URL}{body['id']}/").status_code == 200


BAD = {
    "no name": lambda d: {"name": None},
    "blank name": lambda d: {"name": "   "},
    "name too long": lambda d: {"name": "x" * 201},
    "bad url": lambda d: {"image_url": "not-a-url"},
    "unknown category": lambda d: {"category": "Nope"},
    "unknown ingredient": lambda d: {"ingredients": [{"ingredient": 999999}]},
    "duplicate ingredient": lambda d: {"ingredients": [{"ingredient": d.lime.id}, {"ingredient": d.lime.id}]},
    "ingredients not a list": lambda d: {"ingredients": "mint"},
}


@pytest.mark.parametrize("case", BAD)
def test_invalid_payload_is_rejected_and_creates_nothing(user_api, data, case):
    before = Cocktail.objects.count()
    body = payload(data, **BAD[case](data))
    if body["name"] is None:
        del body["name"]
    assert user_api.post(URL, body, format="json").status_code == 400
    assert Cocktail.objects.count() == before


def test_patch_without_ingredients_keeps_them(admin_api, data):
    response = admin_api.patch(f"{URL}{data.mojito.id}/", {"glass": "Jar"}, format="json")
    assert response.status_code == 200 and response.json()["glass"] == "Jar"
    assert len(response.json()["ingredients"]) == 4


def test_patch_with_ingredients_replaces_the_list(admin_api, data):
    body = {"ingredients": [{"ingredient": data.mint.id, "measure": "1"}]}
    response = admin_api.patch(f"{URL}{data.mojito.id}/", body, format="json")
    assert measures(response.json()) == {"Mint": "1"}
    assert CocktailIngredient.objects.filter(cocktail=data.mojito).count() == 1


def test_put_replaces_fields_and_keeps_omitted_ingredients(admin_api, data):
    response = admin_api.put(f"{URL}{data.virgin.id}/", {"name": "Renamed", "category": "Shot"}, format="json")
    assert response.status_code == 200
    assert response.json()["name"] == "Renamed" and response.json()["category"] == "Shot"
    assert len(response.json()["ingredients"]) == 2


def test_delete_removes_cocktail_and_links_but_not_ingredients(admin_api, data):
    assert admin_api.delete(f"{URL}{data.mojito.id}/").status_code == 204
    assert admin_api.get(f"{URL}{data.mojito.id}/").status_code == 404
    assert not CocktailIngredient.objects.filter(cocktail_id=data.mojito.id).exists()
    assert Ingredient.objects.filter(id=data.lime.id).exists()


def test_delete_unknown_cocktail_is_404(admin_api, data):
    assert admin_api.delete(f"{URL}999999/").status_code == 404
