from datetime import timedelta

from django.utils import timezone

from cocktails.models import Cocktail, CocktailView, Review

ME_REVIEWS = "/api/v1/me/reviews/"
ME_ACTIVITY = "/api/v1/me/activity/"
ME_STATS = "/api/v1/me/stats/"
GLASSES = "/api/v1/glasses/"


def review(author, cocktail, rating, text="", age_days=0):
    r = Review.objects.create(author=author, cocktail=cocktail, rating=rating, text=text)
    Review.objects.filter(pk=r.pk).update(created_at=timezone.now() - timedelta(days=age_days))  # auto_now_add nie pozwala ustawić daty
    return r


def view(cocktail, days_ago, visitor):
    CocktailView.objects.create(cocktail=cocktail, day=timezone.localdate() - timedelta(days=days_ago), visitor=visitor)


# ---- dostęp ----

def test_the_personal_endpoints_need_a_login(api, data):
    for url in (ME_REVIEWS, ME_ACTIVITY, ME_STATS):
        assert api.get(url).status_code == 401


def test_the_glass_list_is_public_sorted_and_without_empty_values(api, data):
    Cocktail.objects.create(name="No glass", category=data.shot_cat, glass="")
    Cocktail.objects.create(name="Tall", category=data.shot_cat, glass="Collins glass")
    assert api.get(GLASSES).json() == ["Collins glass", "Highball glass"]  # bez duplikatów, bez pustych, alfabetycznie


# ---- moje opinie ----

def test_my_reviews_are_only_mine_newest_first_with_the_cocktail(make_user, as_user, data):
    anna, bob = make_user("anna"), make_user("bob")
    review(anna, data.mojito, 5, "super", age_days=3)
    review(anna, data.shot, 2, age_days=1)
    review(bob, data.mojito, 1)  # cudza opinia nie może się pojawić
    body = as_user(anna).get(ME_REVIEWS).json()
    assert body["count"] == 2
    assert [r["rating"] for r in body["results"]] == [2, 5]  # najnowsza pierwsza
    first = body["results"][0]
    assert first["cocktail"] == {"id": data.shot.id, "name": "Lemon Shot", "image_url": ""}
    assert set(first) == {"id", "rating", "text", "created_at", "updated_at", "cocktail"}


# ---- aktywność ----

def test_activity_mixes_received_and_given_reviews_newest_first(make_user, as_user, data):
    anna, bob, cecil = make_user("anna"), make_user("bob"), make_user("cecil")
    Cocktail.objects.filter(pk=data.virgin.pk).update(author=anna, author_name="anna")
    review(bob, data.virgin, 5, "od boba", age_days=2)  # ktoś ocenił mój koktajl
    review(anna, data.mojito, 4, "moja", age_days=1)  # ja oceniłam cudzy
    review(cecil, data.mojito, 3, age_days=0)  # cudza opinia o cudzym koktajlu: nie dotyczy mnie
    events = as_user(anna).get(ME_ACTIVITY).json()
    assert [(e["kind"], e["author_username"], e["rating"]) for e in events] == [("given", "anna", 4), ("received", "bob", 5)]
    assert events[1]["cocktail"]["name"] == "Virgin Mojito"


def test_activity_respects_the_limit_and_ignores_bad_values(make_user, as_user, data):
    anna = make_user("anna")
    for i, cocktail in enumerate([data.mojito, data.virgin, data.shot]):
        review(anna, cocktail, 3, age_days=i)
    client = as_user(anna)
    assert len(client.get(ME_ACTIVITY, {"limit": 2}).json()) == 2
    assert len(client.get(ME_ACTIVITY, {"limit": "abc"}).json()) == 3  # zły limit = domyślny
    assert len(client.get(ME_ACTIVITY, {"limit": 0}).json()) == 1  # najmniej 1
    assert len(client.get(ME_ACTIVITY, {"limit": 999}).json()) == 3  # najwyżej 30


def test_my_own_review_of_my_own_cocktail_is_not_counted_twice(make_user, as_user, data):
    anna = make_user("anna")
    Cocktail.objects.filter(pk=data.virgin.pk).update(author=anna, author_name="anna")
    Review.objects.create(author=anna, cocktail=data.virgin, rating=5)  # da się tylko obejściem API; nie ma być "received" i "given"
    assert [e["kind"] for e in as_user(anna).get(ME_ACTIVITY).json()] == ["given"]


# ---- statystyki ----

def test_stats_for_an_author_with_views_and_reviews(make_user, as_user, data):
    anna, bob, cecil = make_user("anna"), make_user("bob"), make_user("cecil")
    Cocktail.objects.filter(pk__in=[data.virgin.pk, data.shot.pk]).update(author=anna, author_name="anna")
    view(data.virgin, 0, "a")
    view(data.virgin, 0, "b")
    view(data.shot, 5, "a")
    view(data.virgin, 29, "c")
    view(data.virgin, 40, "d")  # starsze niż 30 dni: liczy się do sumy, ale nie ma go na wykresie
    view(data.mojito, 0, "x")  # cudzy koktajl
    review(bob, data.virgin, 5)
    review(cecil, data.virgin, 4)
    review(bob, data.shot, 3)
    review(anna, data.mojito, 2)  # moja opinia o cudzym: nie wchodzi do średniej moich koktajli
    stats = as_user(anna).get(ME_STATS).json()
    assert stats["recipes"] == 2
    assert stats["views_total"] == 5
    assert stats["views_30d"] == 4
    assert stats["rating_avg"] == 4.0 and stats["rating_count"] == 3
    assert stats["reviews_written"] == 1
    days = stats["views_by_day"]
    assert len(days) == 30
    assert days[-1]["day"] == str(timezone.localdate()) and days[-1]["views"] == 2  # dziś
    assert days[0]["views"] == 1  # 29 dni temu
    assert days[-6]["views"] == 1  # 5 dni temu
    assert sum(d["views"] for d in days) == 4


def test_stats_for_a_new_user_are_zeros_not_errors(make_user, as_user, data):
    stats = as_user(make_user("newbie")).get(ME_STATS).json()
    assert stats["recipes"] == 0 and stats["views_total"] == 0 and stats["rating_avg"] is None and stats["rating_count"] == 0
    assert len(stats["views_by_day"]) == 30 and all(d["views"] == 0 for d in stats["views_by_day"])


def test_stats_do_not_leak_other_peoples_numbers(make_user, as_user, data):
    anna, bob = make_user("anna"), make_user("bob")
    Cocktail.objects.filter(pk=data.virgin.pk).update(author=bob, author_name="bob")
    view(data.virgin, 0, "a")
    review(anna, data.virgin, 5)
    assert as_user(anna).get(ME_STATS).json()["views_total"] == 0
    assert as_user(bob).get(ME_STATS).json()["views_total"] == 1
