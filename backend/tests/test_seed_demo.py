from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from accounts.models import User
from cocktails.models import Category, Cocktail, CocktailView, Review

COCKTAILS = "/api/v1/cocktails/"
NAMES = ["Mojito", "Strawberry Margarita", "Margarita", "Blue Margarita", "Absinthe #2"]


@pytest.fixture(autouse=True)
def default_thresholds(settings):
    settings.LABEL_THRESHOLDS = {"trending_views_14d": 10, "popular_views_30d": 20, "most_popular_views_30d": 100}


@pytest.fixture
def solvro_like(db):
    category = Category.objects.create(name="Cocktail")
    return {name: Cocktail.objects.create(name=name, category=category, verified=True) for name in NAMES}


def seed(*flags):
    out = StringIO()
    call_command("seed_demo", "--yes", *flags, stdout=out)
    return out.getvalue()


def card(api, cocktail):
    return api.get(f"{COCKTAILS}{cocktail.id}/").json()


def snapshot():
    return (User.objects.count(), Review.objects.count(), CocktailView.objects.count())


def test_seeding_produces_every_label_and_the_ratings(api, solvro_like):
    seed()
    mojito, margarita = card(api, solvro_like["Mojito"]), card(api, solvro_like["Margarita"])
    assert mojito["status"] == "trending" and mojito["rating_count"] == 6 and mojito["rating_avg"] == 4.67  # 5 opinii + 1 od usuniętego konta
    assert card(api, solvro_like["Strawberry Margarita"])["status"] == "trending"
    assert margarita["status"] == "most_popular" and margarita["rating_avg"] == 4.33
    assert card(api, solvro_like["Blue Margarita"])["status"] == "popular"
    absinthe = card(api, solvro_like["Absinthe #2"])
    assert absinthe["status"] is None and absinthe["rating_avg"] == 2.0


def test_one_demo_review_comes_from_a_deleted_account(api, solvro_like):
    seed()
    reviews = api.get(f"{COCKTAILS}{solvro_like['Mojito'].id}/reviews/").json()["results"]
    assert [r["author_username"] for r in reviews].count(None) == 1
    assert not User.objects.filter(username="demo_usuniety").exists()


def test_running_it_twice_changes_nothing(solvro_like):
    seed()
    first = snapshot()
    seed()
    assert snapshot() == first


def test_demo_accounts_cannot_log_in(api, solvro_like):
    seed()
    assert all(not u.has_usable_password() for u in User.objects.filter(username__startswith="demo_"))
    for password in ("", "demo", "Sup3r-secret-pw"):
        assert api.post("/api/v1/auth/login/", {"username": "demo_anna", "password": password}, format="json").status_code in (400, 401)


def test_remove_deletes_only_what_the_command_made(solvro_like, make_user):
    real_user = make_user("realperson")
    Review.objects.create(cocktail=solvro_like["Mojito"], author=real_user, rating=1, text="my own review")
    CocktailView.objects.create(cocktail=solvro_like["Mojito"], day="2026-10-01", visitor="a-real-visitor-hash")
    before = snapshot()
    seed()
    assert snapshot() != before
    out = seed("--remove")
    assert snapshot() == before and "Usunięto" in out
    assert Review.objects.filter(author=real_user).exists() and CocktailView.objects.filter(visitor="a-real-visitor-hash").exists()


def test_it_asks_before_writing_and_does_nothing_on_no(solvro_like, monkeypatch):
    monkeypatch.setattr("builtins.input", lambda prompt: "n")
    before = snapshot()
    with pytest.raises(CommandError):
        call_command("seed_demo", stdout=StringIO())
    assert snapshot() == before


def test_it_shows_which_database_it_is_about_to_change(solvro_like, monkeypatch):
    prompts = []
    monkeypatch.setattr("builtins.input", lambda prompt: prompts.append(prompt) or "t")
    out = StringIO()
    call_command("seed_demo", stdout=out)
    assert "Baza danych:" in out.getvalue() and prompts and "bazie" in prompts[0]


def test_cocktails_missing_from_the_database_are_skipped_not_fatal(db):
    out = seed()
    assert "Pominięte" in out and "Mojito" in out and snapshot()[1:] == (0, 0)


def test_the_demo_ranking_makes_sense_to_a_reader(api, solvro_like):
    seed()
    order = [c["name"] for c in api.get(COCKTAILS, {"ordering": "-top_rated"}).json()["results"]]
    assert order[0] == "Mojito"  # sześć wysokich ocen wygrywa z jedną czwórką
    assert order.index("Absinthe #2") == len(order) - 1  # a jedyna dwójka jest na końcu
