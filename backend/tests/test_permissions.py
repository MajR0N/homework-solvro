from types import SimpleNamespace

import pytest

COCKTAILS = "/api/v1/cocktails/"
INGREDIENTS = "/api/v1/ingredients/"
ADMIN_LEVEL = [("user", False), ("admin", True), ("staff", True), ("owner", True)]


@pytest.fixture(params=["cocktail", "ingredient"])
def resource(request, data):
    """Te same zasady mają działać dla koktajli i składników, więc każdy test leci na obu."""
    if request.param == "cocktail":
        return SimpleNamespace(url=COCKTAILS, body={"name": "Mine", "category": "Cocktail"}, imported=f"{COCKTAILS}{data.mojito.id}/")
    return SimpleNamespace(url=INGREDIENTS, body={"name": "Mine"}, imported=f"{INGREDIENTS}{data.unused.id}/")


def create(client, resource, **extra):
    response = client.post(resource.url, {**resource.body, **extra}, format="json")
    assert response.status_code == 201
    return response.json()


def test_anonymous_can_read_but_not_write(api, resource):
    assert api.get(resource.url).status_code == 200
    assert api.post(resource.url, resource.body, format="json").status_code == 401
    assert api.patch(resource.imported, {"name": "x"}, format="json").status_code == 401
    assert api.delete(resource.imported).status_code == 401


def test_author_comes_from_the_login_not_from_the_request(make_user, as_user, resource):
    anna, bob = make_user("anna"), make_user("bob")
    item = create(as_user(anna), resource, author=bob.id, author_name="mallory")
    assert item["author"] == anna.id and item["author_name"] == "anna"


def test_author_cannot_be_reassigned_by_editing(make_user, as_user, resource):
    anna, bob = make_user("anna"), make_user("bob")
    client = as_user(anna)
    url = f"{resource.url}{create(client, resource)['id']}/"
    body = client.patch(url, {"author": bob.id, "author_name": "mallory"}, format="json").json()
    assert body["author"] == anna.id and body["author_name"] == "anna"


def test_author_can_change_and_delete_own_content(make_user, as_user, resource):
    anna = as_user(make_user("anna"))
    url = f"{resource.url}{create(anna, resource)['id']}/"
    assert anna.patch(url, {"name": "Edited"}, format="json").status_code == 200
    assert anna.delete(url).status_code == 204


@pytest.mark.parametrize("role, allowed", ADMIN_LEVEL)
def test_someone_elses_content_needs_admin_level(make_user, as_user, resource, role, allowed):
    url = f"{resource.url}{create(as_user(make_user('anna')), resource)['id']}/"
    actor = as_user(make_user("other", role=role))
    assert actor.patch(url, {"name": "Edited"}, format="json").status_code == (200 if allowed else 403)
    assert actor.delete(url).status_code == (204 if allowed else 403)


@pytest.mark.parametrize("role, allowed", ADMIN_LEVEL)
def test_imported_content_has_no_author_so_only_admin_level_may_change_it(make_user, as_user, resource, role, allowed):
    actor = as_user(make_user("other", role=role))
    assert actor.patch(resource.imported, {"name": "Edited"}, format="json").status_code == (200 if allowed else 403)
    assert actor.delete(resource.imported).status_code == (204 if allowed else 403)


def test_imported_items_show_no_author(api, data):
    body = api.get(f"{COCKTAILS}{data.mojito.id}/").json()
    assert body["author"] is None and body["author_name"] == ""


def test_filter_cocktails_by_author(make_user, as_user, data):
    anna, bob = as_user(make_user("anna")), as_user(make_user("bob"))
    for client, name in [(anna, "A1"), (anna, "A2"), (bob, "B1")]:
        client.post(COCKTAILS, {"name": name, "category": "Cocktail"}, format="json")
    names = lambda q: sorted(c["name"] for c in anna.get(COCKTAILS, q).json()["results"])
    assert names({"author": "anna"}) == ["A1", "A2"]
    assert names({"author": "ANNA"}) == ["A1", "A2"]
    assert names({"author": "nobody"}) == []


def test_deleted_account_keeps_its_content_with_a_name_copy(make_user, as_user, resource):
    anna = make_user("anna")
    url = f"{resource.url}{create(as_user(anna), resource)['id']}/"
    anna.delete()
    body = as_user(make_user("bob")).get(url).json()
    assert body["author"] is None and body["author_name"] == "anna"
    assert as_user(make_user("bob2")).patch(url, {"name": "x"}, format="json").status_code == 403  # nie jest już czyjeś
    assert as_user(make_user("adam", role="admin")).patch(url, {"name": "x"}, format="json").status_code == 200
