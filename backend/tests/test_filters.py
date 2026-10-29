import pytest

from cocktails.filters import CocktailFilter
from cocktails.models import Cocktail

URL = "/api/v1/cocktails/"


def names(response):
    return [c["name"] for c in response.json()["results"]]


def test_search_ignores_case(api, data):
    assert names(api.get(URL, {"search": "MOJ"})) == ["Mojito", "Virgin Mojito"]


def test_category_is_exact_name(api, data):
    assert names(api.get(URL, {"category": "Shot"})) == ["Lemon Shot"]
    assert api.get(URL, {"category": "Sho"}).json()["count"] == 0


def test_alcoholic_true_and_false(api, data):
    assert names(api.get(URL, {"alcoholic": "false"})) == ["Virgin Mojito"]
    assert names(api.get(URL, {"alcoholic": "true"})) == ["Lemon Shot", "Mojito"]


def test_ingredient_matches_each_cocktail_once(api, data):
    # Mojito ma "Lime" i "Lime juice": przy zwykłym join pojawiłby się dwa razy
    assert names(api.get(URL, {"ingredient": "lime"})) == ["Lemon Shot", "Mojito", "Virgin Mojito"]


def test_ingredient_with_commas_requires_all(api, data):
    assert names(api.get(URL, {"ingredient": "mint,rum"})) == ["Mojito"]


def test_task_example_non_alcoholic_with_mint(api, data):
    assert names(api.get(URL, {"alcoholic": "false", "ingredient": "mint"})) == ["Virgin Mojito"]


def test_id_filter_returns_only_listed(api, data):
    ids = f"{data.mojito.id},{data.shot.id}"
    assert names(api.get(URL, {"id": ids})) == ["Lemon Shot", "Mojito"]


def test_empty_id_means_none_not_all(api, data):
    assert api.get(URL, {"id": ""}).json()["count"] == 0


@pytest.mark.parametrize("query", [{"verified": "maybe"}, {"alcoholic": "maybe"}, {"alcoholic": "True"}, {"ordering": "glass"}, {"id": "1,abc"}])
def test_bad_filter_values_return_400(api, data, query):
    assert api.get(URL, query).status_code == 400


def test_ordering_descending(api, data):
    assert names(api.get(URL, {"ordering": "-name"})) == ["Virgin Mojito", "Mojito", "Lemon Shot"]


def test_every_sort_ends_with_id_as_tiebreaker(data):
    # Zachowania nie da się wymusić na małych danych (Postgres zwykle i tak zwraca remisy stabilnie),
    # więc sprawdzamy wprost, że zapytanie ma id na końcu ORDER BY.
    for ordering in ("name", "-name", "id", ""):
        qs = CocktailFilter({"ordering": ordering}, queryset=Cocktail.objects.all()).qs
        assert qs.query.order_by[-1] == "id"


def test_pages_together_contain_every_row_exactly_once(api, data):
    Cocktail.objects.bulk_create(Cocktail(name="Twin", category=data.shot_cat) for _ in range(5))
    seen = []
    for page in range(1, 9):
        response = api.get(URL, {"search": "twin", "ordering": "name", "page_size": 2, "page": page})
        if response.status_code == 404:
            break
        seen += [c["id"] for c in response.json()["results"]]
    assert len(seen) == 5 and len(set(seen)) == 5


def test_pagination_defaults_and_cap(api, data):
    Cocktail.objects.bulk_create(Cocktail(name=f"Bulk {i:03}", category=data.shot_cat) for i in range(120))
    assert len(api.get(URL).json()["results"]) == 20
    assert len(api.get(URL, {"page_size": 500}).json()["results"]) == 100
    assert api.get(URL, {"page": 999}).status_code == 404


def test_categories_are_a_plain_list(api, data):
    body = api.get("/api/v1/categories/").json()
    assert [c["name"] for c in body] == ["Cocktail", "Shot"]


def test_verified_filter_and_sorting(api, data):
    assert names(api.get(URL, {"verified": "true"})) == ["Lemon Shot", "Mojito"]
    assert names(api.get(URL, {"verified": "false"})) == ["Virgin Mojito"]
    assert names(api.get(URL, {"ordering": "-verified"}))[0] != "Virgin Mojito"  # zweryfikowane najpierw
    assert names(api.get(URL, {"ordering": "verified"}))[0] == "Virgin Mojito"
    assert api.get(URL, {"verified": "yes"}).status_code == 400
