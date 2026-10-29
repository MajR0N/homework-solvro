import pytest
from django.db import IntegrityError, transaction

from cocktails.models import Cocktail, Review, ReviewReport

COCKTAILS = "/api/v1/cocktails/"


def reviews_url(cocktail):
    return f"{COCKTAILS}{cocktail.id}/reviews/"


def review_url(review_id):
    return f"/api/v1/reviews/{review_id}/"


def post_review(client, cocktail, rating=5, text="Super"):
    return client.post(reviews_url(cocktail), {"rating": rating, "text": text}, format="json")


def rating_of(api, cocktail):
    body = api.get(f"{COCKTAILS}{cocktail.id}/").json()
    return body["rating_avg"], body["rating_count"]


def test_anyone_can_read_reviews_but_only_logged_in_users_can_write(api, data, user_api):
    assert api.get(reviews_url(data.mojito)).status_code == 200
    assert post_review(api, data.mojito).status_code == 401
    assert post_review(user_api, data.mojito).status_code == 201


def test_created_review_gets_its_author_and_cocktail_from_the_server(api, data, make_user, as_user):
    anna, bob = make_user("anna"), make_user("bob")
    body = as_user(anna).post(
        reviews_url(data.mojito), {"rating": 4, "text": "ok", "author": bob.id, "cocktail": data.virgin.id}, format="json"
    ).json()
    assert body["author"] == anna.id and body["author_username"] == "anna" and body["cocktail"] == data.mojito.id


@pytest.mark.parametrize("rating, status", [(1, 201), (5, 201), (0, 400), (6, 400), (-1, 400), (4.5, 400), ("x", 400), (None, 400)])
def test_rating_must_be_a_whole_number_from_1_to_5(user_api, data, rating, status):
    assert post_review(user_api, data.mojito, rating=rating).status_code == status


def test_rating_is_required_and_text_is_limited(user_api, data):
    assert user_api.post(reviews_url(data.mojito), {"text": "no rating"}, format="json").status_code == 400
    assert post_review(user_api, data.mojito, text="x" * 2001).status_code == 400
    assert post_review(user_api, data.mojito, text="").status_code == 201


def test_one_review_per_user_per_cocktail_but_other_cocktails_are_fine(user_api, data):
    assert post_review(user_api, data.mojito).status_code == 201
    assert post_review(user_api, data.mojito, rating=1).status_code == 409
    assert post_review(user_api, data.virgin).status_code == 201
    assert Review.objects.count() == 2


def test_you_cannot_review_your_own_cocktail(make_user, as_user, data):
    anna = as_user(make_user("anna"))
    own = anna.post(COCKTAILS, {"name": "Mine", "category": "Cocktail"}, format="json").json()["id"]
    response = anna.post(f"{COCKTAILS}{own}/reviews/", {"rating": 5}, format="json")
    assert response.status_code == 403 and not Review.objects.exists()


def test_unknown_cocktail_is_404_for_reading_and_writing(api, user_api, data):
    assert api.get(f"{COCKTAILS}999999/reviews/").status_code == 404
    assert user_api.post(f"{COCKTAILS}999999/reviews/", {"rating": 5}, format="json").status_code == 404


def test_reviews_are_listed_newest_first_and_paginated(api, make_user, as_user, data):
    for i in range(25):
        post_review(as_user(make_user(f"user{i:02}")), data.mojito, rating=1 + i % 5, text=f"review {i}")
    page = api.get(reviews_url(data.mojito)).json()
    assert page["count"] == 25 and len(page["results"]) == 20
    assert page["results"][0]["text"] == "review 24"


def test_cocktail_shows_average_rating_and_count(api, make_user, as_user, data):
    assert rating_of(api, data.mojito) == (None, 0)
    for name, stars in [("a", 5), ("b", 4), ("c", 3), ("d", 4)]:
        post_review(as_user(make_user(name)), data.mojito, rating=stars)
    assert rating_of(api, data.mojito) == (4.0, 4)
    listed = {c["name"]: (c["rating_avg"], c["rating_count"]) for c in api.get(COCKTAILS).json()["results"]}
    assert listed["Mojito"] == (4.0, 4) and listed["Virgin Mojito"] == (None, 0)


def test_rating_numbers_are_rounded_to_two_places(api, make_user, as_user, data):
    for name, stars in [("a", 5), ("b", 4), ("c", 4)]:
        post_review(as_user(make_user(name)), data.mojito, rating=stars)
    assert rating_of(api, data.mojito) == (4.33, 3)


def test_ratings_do_not_inflate_when_filtering_by_ingredient(api, make_user, as_user, data):
    # Mojito ma dwa pasujące składniki ("Lime", "Lime juice"): zwykły join podwoiłby liczbę opinii
    post_review(as_user(make_user("a")), data.mojito, rating=5)
    mojito = next(c for c in api.get(COCKTAILS, {"ingredient": "lime"}).json()["results"] if c["name"] == "Mojito")
    assert mojito["rating_count"] == 1


# ---- zmiana i usuwanie ----

def test_only_the_author_can_edit_a_review_even_admins_cannot(make_user, as_user, data):
    anna = as_user(make_user("anna"))
    rid = post_review(anna, data.mojito).json()["id"]
    assert anna.patch(review_url(rid), {"rating": 2}, format="json").status_code == 200
    assert as_user(make_user("bob")).patch(review_url(rid), {"rating": 1}, format="json").status_code == 403
    for role in ("admin", "staff", "owner"):
        boss = as_user(make_user(f"boss_{role}", role=role))
        assert boss.patch(review_url(rid), {"text": "putting words in her mouth"}, format="json").status_code == 403
        assert boss.put(review_url(rid), {"rating": 1}, format="json").status_code == 403
    assert Review.objects.get(id=rid).rating == 2


def test_edit_keeps_author_and_cocktail(make_user, as_user, data):
    anna, bob = make_user("anna"), make_user("bob")
    rid = post_review(as_user(anna), data.mojito).json()["id"]
    body = as_user(anna).patch(review_url(rid), {"author": bob.id, "cocktail": data.virgin.id}, format="json").json()
    assert body["author"] == anna.id and body["cocktail"] == data.mojito.id


@pytest.mark.parametrize("role, allowed", [("user", False), ("admin", True), ("staff", True), ("owner", True)])
def test_deleting_someone_elses_review_needs_admin_level(make_user, as_user, data, role, allowed):
    rid = post_review(as_user(make_user("anna")), data.mojito).json()["id"]
    response = as_user(make_user("other", role=role)).delete(review_url(rid))
    assert response.status_code == (204 if allowed else 403)
    assert Review.objects.filter(id=rid).exists() is not allowed


def test_author_can_delete_own_review_and_anonymous_cannot(api, make_user, as_user, data):
    anna = as_user(make_user("anna"))
    rid = post_review(anna, data.mojito).json()["id"]
    assert api.delete(review_url(rid)).status_code == 401
    assert anna.delete(review_url(rid)).status_code == 204
    assert api.get(review_url(rid)).status_code == 404


def test_deleted_account_leaves_the_review_shown_as_deleted_user_and_still_counted(api, make_user, as_user, data):
    anna = make_user("anna")
    rid = post_review(as_user(anna), data.mojito, rating=4).json()["id"]
    anna.delete()
    body = api.get(review_url(rid)).json()
    assert body["author"] is None and body["author_username"] is None and body["rating"] == 4
    assert rating_of(api, data.mojito) == (4.0, 1)


def test_two_deleted_accounts_can_both_keep_a_review_on_one_cocktail(api, make_user, as_user, data):
    a, b = make_user("a"), make_user("b")
    post_review(as_user(a), data.mojito)
    post_review(as_user(b), data.mojito)
    a.delete()
    b.delete()
    assert Review.objects.filter(cocktail=data.mojito, author=None).count() == 2


def test_deleting_a_cocktail_deletes_its_reviews(make_user, as_user, admin_api, data):
    post_review(as_user(make_user("anna")), data.mojito)
    admin_api.delete(f"{COCKTAILS}{data.mojito.id}/")
    assert not Review.objects.exists()


def test_the_database_itself_rejects_ratings_outside_1_to_5(data, make_user):
    with pytest.raises(IntegrityError), transaction.atomic():
        Review.objects.create(cocktail=data.mojito, author=make_user("anna"), rating=9)


# ---- zgłoszenia ----

def test_any_logged_in_user_can_report_once_and_the_review_stays(api, make_user, as_user, data):
    rid = post_review(as_user(make_user("anna")), data.mojito).json()["id"]
    url = f"{review_url(rid)}report/"
    assert api.post(url, {"reason": "spam"}, format="json").status_code == 401
    bob = as_user(make_user("bob"))
    assert bob.post(url, {"reason": "spam"}, format="json").status_code == 201
    assert bob.post(url, {"reason": "spam again"}, format="json").status_code == 200  # nie dubluje
    assert as_user(make_user("carl")).post(url, {}, format="json").status_code == 201  # powód jest opcjonalny
    assert ReviewReport.objects.filter(review_id=rid).count() == 2
    assert Review.objects.filter(id=rid).exists()


def test_the_cocktails_author_can_report_but_not_delete_a_review(make_user, as_user, data):
    owner_of_cocktail = as_user(make_user("author"))
    cid = owner_of_cocktail.post(COCKTAILS, {"name": "Mine", "category": "Cocktail"}, format="json").json()["id"]
    rid = as_user(make_user("fan")).post(f"{COCKTAILS}{cid}/reviews/", {"rating": 1}, format="json").json()["id"]
    assert owner_of_cocktail.delete(review_url(rid)).status_code == 403
    assert owner_of_cocktail.post(f"{review_url(rid)}report/", {"reason": "unfair"}, format="json").status_code == 201


def test_reporting_an_unknown_review_is_404_and_too_long_reason_is_400(user_api, make_user, as_user, data):
    assert user_api.post("/api/v1/reviews/999999/report/", {}, format="json").status_code == 404
    rid = post_review(as_user(make_user("writer")), data.mojito).json()["id"]
    assert user_api.post(f"{review_url(rid)}report/", {"reason": "x" * 301}, format="json").status_code == 400


def test_deleting_the_reported_review_removes_its_reports(make_user, as_user, admin_api, data):
    rid = post_review(as_user(make_user("anna")), data.mojito).json()["id"]
    as_user(make_user("bob")).post(f"{review_url(rid)}report/", {}, format="json")
    admin_api.delete(review_url(rid))
    assert not ReviewReport.objects.exists()


# ---- CMS ----

def test_cms_lists_reviews_with_reports_and_allows_delete_but_not_edit(make_user, as_user, data):
    from django.test import Client

    rid = post_review(as_user(make_user("anna")), data.mojito).json()["id"]
    as_user(make_user("bob")).post(f"{review_url(rid)}report/", {"reason": "spam"}, format="json")
    cms = Client()
    cms.force_login(make_user("adam", role="admin"))
    assert cms.get("/admin/cocktails/review/").status_code == 200
    assert cms.get("/admin/cocktails/reviewreport/").status_code == 200
    assert cms.get(f"/admin/cocktails/review/{rid}/change/").status_code == 200  # tylko podgląd
    assert cms.post(f"/admin/cocktails/review/{rid}/change/", {"rating": 1, "text": "edited"}).status_code == 403
    assert Review.objects.get(id=rid).text == "Super"
    assert cms.post(f"/admin/cocktails/review/{rid}/delete/", {"post": "yes"}).status_code == 302
    assert not Review.objects.filter(id=rid).exists()
