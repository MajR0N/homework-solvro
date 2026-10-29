import pytest
from django.test import Client

from accounts.models import User
from cocktails.models import Cocktail

pytestmark = pytest.mark.django_db
PASSWORD = "Sup3r-secret-pw"


@pytest.fixture
def cms(make_user):
    """cms("admin") -> przeglądarka zalogowana do panelu /admin/ jako nowe konto z tą rolą."""

    def login(role, username=None):
        user = make_user(username or f"{role}_actor", role=role)
        client = Client()
        client.force_login(user)
        client.user = user
        return client

    return login


def change(client, target, **fields):
    data = {"username": target.username, "role": target.role, "is_active": "on", **fields}
    return client.post(f"/admin/accounts/user/{target.id}/change/", data)


def delete(client, target):
    return client.post(f"/admin/accounts/user/{target.id}/delete/", {"post": "yes"})


@pytest.mark.parametrize("role, allowed", [("user", False), ("admin", True), ("staff", True), ("owner", True)])
def test_only_admin_level_can_enter_the_cms(cms, role, allowed):
    client = cms(role)
    assert (client.get("/admin/").status_code == 200) is allowed
    if not allowed:
        assert client.get("/admin/").status_code == 302  # odesłany do logowania


def test_anonymous_is_sent_to_the_login_page():
    assert Client().get("/admin/").status_code == 302


# (kto, kogo): True = wolno zmieniać i usuwać. Wolno tylko konta o NIŻSZEJ randze, siebie i równych sobie nie.
RANK_RULES = [
    ("admin", "user", True), ("admin", "admin", False), ("admin", "staff", False), ("admin", "owner", False),
    ("staff", "user", True), ("staff", "admin", True), ("staff", "staff", False), ("staff", "owner", False),
    ("owner", "user", True), ("owner", "admin", True), ("owner", "staff", True), ("owner", "owner", False),
]


@pytest.mark.parametrize("actor, target, allowed", RANK_RULES)
def test_you_can_only_change_and_delete_accounts_below_your_rank(cms, make_user, actor, target, allowed):
    client = cms(actor)
    victim = make_user("victim", role=target)
    assert change(client, victim, is_active="").status_code == (302 if allowed else 403)
    victim.refresh_from_db()
    assert victim.is_active is (not allowed)
    assert delete(client, victim).status_code == (302 if allowed else 403)
    assert User.objects.filter(id=victim.id).exists() is (not allowed)


def test_nobody_can_edit_or_delete_themselves(cms):
    client = cms("staff")
    assert change(client, client.user, is_active="").status_code == 403
    assert delete(client, client.user).status_code == 403


# (kto, jaką rolę próbuje nadać, czy się udaje): nadać można tylko rolę niższą od własnej
GRANT_RULES = [
    ("admin", "user", True), ("admin", "admin", False), ("admin", "owner", False),
    ("staff", "admin", True), ("staff", "staff", False), ("staff", "owner", False),
    ("owner", "staff", True), ("owner", "owner", False),
]


@pytest.mark.parametrize("actor, role, allowed", GRANT_RULES)
def test_you_can_only_hand_out_roles_below_your_own_when_creating(cms, actor, role, allowed):
    client = cms(actor)
    data = {"username": "newbie", "password1": PASSWORD, "password2": PASSWORD, "role": role}
    response = client.post("/admin/accounts/user/add/", data)
    assert (response.status_code == 302) is allowed
    assert User.objects.filter(username="newbie").exists() is allowed


@pytest.mark.parametrize("actor, role, allowed", GRANT_RULES)
def test_you_can_only_hand_out_roles_below_your_own_when_editing(cms, make_user, actor, role, allowed):
    client = cms(actor)
    victim = make_user("victim")  # zwykły użytkownik, zawsze niżej od każdej roli CMS
    change(client, victim, role=role)
    victim.refresh_from_db()
    assert (victim.role == role) is allowed


def test_django_flags_cannot_be_set_through_the_form(cms, make_user):
    client = cms("owner")
    victim = make_user("victim")
    change(client, victim, is_staff="on", is_superuser="on")
    victim.refresh_from_db()
    assert not victim.is_staff and not victim.is_superuser


def test_cocktail_added_in_the_cms_gets_the_logged_in_author(cms, data):
    client = cms("admin", "adam")
    response = client.post("/admin/cocktails/cocktail/add/", {
        "name": "CMS Drink", "category": data.cocktail_cat.id, "glass": "Jar", "instructions": "Stir.", "image_url": "",
        "links-TOTAL_FORMS": 0, "links-INITIAL_FORMS": 0, "links-MIN_NUM_FORMS": 0, "links-MAX_NUM_FORMS": 1000,
    })
    assert response.status_code == 302
    cocktail = Cocktail.objects.get(name="CMS Drink")
    assert cocktail.author.username == "adam" and cocktail.author_name == "adam"


def test_admin_can_change_and_delete_imported_content(cms, data):
    client = cms("admin")
    assert client.get(f"/admin/cocktails/cocktail/{data.mojito.id}/change/").status_code == 200
    assert client.get("/admin/cocktails/ingredient/").status_code == 200
    assert client.post(f"/admin/cocktails/cocktail/{data.mojito.id}/delete/", {"post": "yes"}).status_code == 302
    assert not Cocktail.objects.filter(id=data.mojito.id).exists()


def test_deleting_an_ingredient_in_use_is_blocked_by_the_cms(cms, data):
    from cocktails.models import Ingredient

    response = cms("owner").post(f"/admin/cocktails/ingredient/{data.lime.id}/delete/", {"post": "yes"})
    assert response.status_code == 200  # strona z informacją, że nie można usunąć
    assert Ingredient.objects.filter(id=data.lime.id).exists()
