import json

import pytest

from cocktails.models import Ingredient

COCKTAILS = "/api/v1/cocktails/"
INGREDIENTS = "/api/v1/ingredients/"


# ---- filtry: długość i liczba wartości ----

@pytest.mark.parametrize("url, param", [
    (COCKTAILS, "search"), (COCKTAILS, "category"), (COCKTAILS, "glass"), (INGREDIENTS, "search"), (INGREDIENTS, "type"),
])
def test_text_filters_accept_100_characters_and_reject_more(api, data, url, param):
    assert api.get(url, {param: "a" * 100}).status_code == 200
    assert api.get(url, {param: "a" * 101}).status_code == 400


def test_author_filter_is_limited_to_the_username_length(api, data):
    assert api.get(COCKTAILS, {"author": "a" * 150}).status_code == 200
    assert api.get(COCKTAILS, {"author": "a" * 151}).status_code == 400


def test_ingredient_filter_allows_ten_terms_and_not_more(api, data):
    assert api.get(COCKTAILS, {"ingredient": ",".join(f"t{i}" for i in range(10))}).status_code == 200
    assert api.get(COCKTAILS, {"ingredient": ",".join(f"t{i}" for i in range(11))}).status_code == 400
    assert api.get(COCKTAILS, {"ingredient": "x" * 101}).status_code == 400


def test_id_filter_allows_200_values_and_not_more(api, data):
    assert api.get(COCKTAILS, {"id": ",".join(str(i) for i in range(200))}).status_code == 200
    assert api.get(COCKTAILS, {"id": ",".join(str(i) for i in range(201))}).status_code == 400


def test_the_limits_do_not_break_normal_searches(api, data):
    assert api.get(COCKTAILS, {"search": "mojito", "ingredient": "mint,lime", "alcoholic": "false"}).json()["count"] == 1


# ---- pola zapisu ----

def cocktail(**extra):
    return {"name": "Mine", "category": "Cocktail", **extra}


def test_instructions_are_limited_to_5000_characters(user_api, data):
    assert user_api.post(COCKTAILS, cocktail(instructions="x" * 5000), format="json").status_code == 201
    assert user_api.post(COCKTAILS, cocktail(instructions="x" * 5001), format="json").status_code == 400


def test_a_cocktail_may_list_at_most_50_ingredients(user_api, data):
    Ingredient.objects.bulk_create(Ingredient(name=f"Bulk {i}") for i in range(51))
    ids = list(Ingredient.objects.values_list("id", flat=True)[:51])
    rows = lambda n: [{"ingredient": i, "measure": "1"} for i in ids[:n]]
    assert user_api.post(COCKTAILS, cocktail(ingredients=rows(50)), format="json").status_code == 201
    assert user_api.post(COCKTAILS, cocktail(ingredients=rows(51)), format="json").status_code == 400


def test_ingredient_description_is_limited_to_10000_characters(user_api, db):
    assert user_api.post(INGREDIENTS, {"name": "A", "description": "x" * 10000}, format="json").status_code == 201
    assert user_api.post(INGREDIENTS, {"name": "B", "description": "x" * 10001}, format="json").status_code == 400


# ---- adresy zdjęć tylko po https ----

BAD_URLS = ["http://example.com/a.png", "ftp://example.com/a.png", "javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "//example.com/a.png"]


@pytest.mark.parametrize("url", BAD_URLS)
def test_image_urls_must_be_https_for_cocktails_and_ingredients(user_api, data, url):
    assert user_api.post(COCKTAILS, cocktail(image_url=url), format="json").status_code == 400
    assert user_api.post(INGREDIENTS, {"name": "A", "image_url": url}, format="json").status_code == 400


def test_https_and_empty_image_urls_are_fine(user_api, data):
    assert user_api.post(COCKTAILS, cocktail(image_url="https://example.com/a.png"), format="json").status_code == 201
    assert user_api.post(COCKTAILS, cocktail(name="Other", image_url=""), format="json").status_code == 201


def test_editing_other_fields_does_not_revalidate_an_untouched_image(admin_api, data):
    assert admin_api.patch(f"{COCKTAILS}{data.mojito.id}/", {"glass": "Jar"}, format="json").status_code == 200


# ---- rozmiar żądania ----

def raw_post(client, url, size):
    body = json.dumps({"name": "x", "padding": "p" * size})
    return client.post(url, data=body, content_type="application/json")


def test_oversized_requests_are_refused_before_they_are_read(api, user_api, data):
    assert raw_post(user_api, COCKTAILS, 150_000).status_code == 413
    assert raw_post(api, "/api/v1/auth/login/", 150_000).status_code == 413  # także bez logowania


def test_requests_just_under_the_limit_are_not_refused_for_their_size(user_api, data):
    assert raw_post(user_api, COCKTAILS, 90_000).status_code != 413


# ---- XSS: tylko JSON, treść zapisana bez zmian ----

def test_the_api_never_answers_with_html(api, data):
    browser = api.get(COCKTAILS, HTTP_ACCEPT="text/html,application/xhtml+xml,*/*;q=0.8")
    assert browser["Content-Type"].startswith("application/json")
    assert not api.get(COCKTAILS, {"format": "api"})["Content-Type"].startswith("text/html")


def test_html_in_user_text_is_stored_as_plain_text_and_served_as_json(user_api, api, data):
    payload = "<img src=x onerror=alert(1)>"
    created = user_api.post(COCKTAILS, cocktail(name=payload, instructions="<script>alert(1)</script>"), format="json").json()
    response = api.get(f"{COCKTAILS}{created['id']}/")
    assert response["Content-Type"].startswith("application/json") and response["X-Content-Type-Options"] == "nosniff"
    assert response.json()["name"] == payload  # nie jest ani zmieniane, ani wykonywane: wyświetlający (React) ma je zakodować


def test_swagger_and_the_schema_still_work_without_the_html_renderer(api):
    assert api.get("/api/docs/").status_code == 200
    assert api.get("/api/schema/").status_code == 200
