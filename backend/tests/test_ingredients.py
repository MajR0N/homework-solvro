import pytest

from cocktails.models import Ingredient

URL = "/api/v1/ingredients/"


def test_list_is_paginated(api, data):
    body = api.get(URL).json()
    assert body["count"] == 5 and len(body["results"]) == 5 and body["next"] is None
    assert len(api.get(URL, {"page_size": 2}).json()["results"]) == 2


def test_search_and_alcoholic_filters(api, data):
    assert [i["name"] for i in api.get(URL, {"search": "lime"}).json()["results"]] == ["Lime", "Lime juice"]
    assert [i["name"] for i in api.get(URL, {"alcoholic": "true"}).json()["results"]] == ["Light rum"]
    assert [i["name"] for i in api.get(URL, {"type": "Herb"}).json()["results"]] == ["Mint"]


@pytest.mark.parametrize("query", [{"alcoholic": "maybe"}, {"ordering": "type"}])
def test_bad_filter_values_return_400(api, data, query):
    assert api.get(URL, query).status_code == 400


@pytest.mark.parametrize("percentage, status", [(0, 201), (100, 201), (40.5, 201), (101, 400), (-1, 400), ("abc", 400)])
def test_percentage_must_be_between_0_and_100(user_api, db, percentage, status):
    response = user_api.post(URL, {"name": "Test", "percentage": percentage}, format="json")
    assert response.status_code == status


def test_name_is_required_and_trimmed(user_api, db):
    assert user_api.post(URL, {}, format="json").status_code == 400
    assert user_api.post(URL, {"name": "  Syrup "}, format="json").json()["name"] == "Syrup"


def test_deleting_an_ingredient_in_use_is_409_and_keeps_it(admin_api, data):
    response = admin_api.delete(f"{URL}{data.lime.id}/")
    assert response.status_code == 409
    assert Ingredient.objects.filter(id=data.lime.id).exists()


def test_deleting_an_unused_ingredient_is_204(admin_api, data):
    assert admin_api.delete(f"{URL}{data.unused.id}/").status_code == 204
    assert not Ingredient.objects.filter(id=data.unused.id).exists()
