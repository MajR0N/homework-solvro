from datetime import timedelta

import pytest
from django.utils import timezone

from accounts import policy
from accounts.admin import UserAdmin
from accounts.models import RANK, Role, User
from cocktails.models import Cocktail, CocktailView, Review, ReviewReport

USERS = "/api/v1/admin/users/"
REPORTS = "/api/v1/admin/reports/"
VERIFY = "/api/v1/admin/cocktails/verify/"
STATS = "/api/v1/admin/stats/"
ROLES = list(Role.values)


def patch_role(client, target, role):
    return client.patch(f"{USERS}{target.id}/", {"role": role}, format="json")


# =================== dostęp ===================

@pytest.mark.parametrize("url", [USERS, REPORTS, STATS])
def test_anonymous_gets_401_and_a_plain_user_gets_403_on_every_admin_read(api, user_api, url):
    assert api.get(url).status_code == 401
    assert user_api.get(url).status_code == 403


def test_a_plain_user_cannot_use_the_admin_writes(make_user, user_api, data):
    victim = make_user("victim")
    assert patch_role(user_api, victim, "admin").status_code == 403
    assert user_api.post(VERIFY, {"ids": [data.mojito.id], "verified": True}, format="json").status_code == 403
    assert user_api.post(f"{REPORTS}1/dismiss/").status_code == 403
    victim.refresh_from_db()
    assert victim.role == "user"


# =================== zmiana roli: eskalacja uprawnień ===================

@pytest.mark.parametrize("actor", ["admin", "staff", "owner"])  # zwykły użytkownik nie ma dostępu do panelu: sprawdzone osobno
@pytest.mark.parametrize("target", ROLES)
@pytest.mark.parametrize("new_role", ROLES)
def test_role_change_matches_the_rules_for_every_combination(make_user, as_user, actor, target, new_role):
    """3 x 4 x 4 kombinacji: wolno tylko, gdy konto jest niższe od mojego i nadawana rola też."""
    boss, other = make_user("boss", actor), make_user("other", target)
    allowed = RANK[target] < RANK[actor] and RANK[new_role] < RANK[actor]
    response = patch_role(as_user(boss), other, new_role)
    other.refresh_from_db()
    if allowed:
        assert response.status_code == 200 and other.role == new_role
    else:
        assert response.status_code == 403 and other.role == target  # nic się nie zmieniło


def test_nobody_can_change_their_own_role(make_user, as_user):
    for role in ["admin", "staff", "owner"]:
        me = make_user(f"me_{role}", role)
        for new_role in ROLES:
            assert patch_role(as_user(me), me, new_role).status_code == 403
        me.refresh_from_db()
        assert me.role == role


def test_owner_role_can_never_be_granted_through_the_api(make_user, as_user):
    owner, user = make_user("o", "owner"), make_user("u")
    assert patch_role(as_user(owner), user, "owner").status_code == 403
    user.refresh_from_db()
    assert user.role == "user"


def test_unknown_role_is_rejected_with_400_not_saved(make_user, as_user):
    staff, user = make_user("s", "staff"), make_user("u")
    assert patch_role(as_user(staff), user, "superadmin").status_code == 400
    user.refresh_from_db()
    assert user.role == "user"


def test_only_the_role_is_writable_through_the_api(make_user, as_user):
    owner, user = make_user("o", "owner"), make_user("u")
    response = as_user(owner).patch(f"{USERS}{user.id}/", {"username": "hacked", "is_active": False, "is_staff": True, "is_superuser": True}, format="json")
    assert response.status_code == 200  # nieznane i tylko-do-odczytu pola są ignorowane
    user.refresh_from_db()
    assert (user.username, user.is_active, user.is_staff, user.is_superuser) == ("u", True, False, False)


def test_put_and_delete_are_not_available(make_user, as_user):
    owner, user = make_user("o", "owner"), make_user("u")
    client = as_user(owner)
    assert client.put(f"{USERS}{user.id}/", {"role": "admin"}, format="json").status_code == 405
    assert client.delete(f"{USERS}{user.id}/").status_code == 405


def test_django_flags_follow_the_role_after_an_api_change(make_user, as_user):
    staff, user = make_user("s", "staff"), make_user("u")
    patch_role(as_user(staff), user, "admin")
    user.refresh_from_db()
    assert user.is_staff and not user.is_superuser  # admin wchodzi do CMS, ale nie jest superużytkownikiem
    patch_role(as_user(staff), user, "user")
    user.refresh_from_db()
    assert not user.is_staff


def test_the_api_and_the_cms_agree_for_every_pair_of_roles(make_user, rf):
    """Jedna polityka dla obu wejść: CMS (UserAdmin) i funkcje policy dają ten sam wynik dla każdej pary."""
    from django.contrib import admin as dj_admin

    cms = UserAdmin(User, dj_admin.site)
    for actor_role in ["admin", "staff", "owner"]:
        for target_role in ROLES:
            actor, target = make_user(f"a_{actor_role}_{target_role}", actor_role), make_user(f"t_{actor_role}_{target_role}", target_role)
            request = rf.get("/")
            request.user = actor
            assert cms.has_change_permission(request, target) == policy.can_manage(actor, target), (actor_role, target_role)
            offered = [v for v, _ in cms.formfield_for_choice_field(User._meta.get_field("role"), request).choices if v]
            assert offered == policy.grantable_roles(actor), actor_role


# =================== lista kont ===================

def test_the_user_list_shows_counts_and_what_i_may_do(make_user, as_user, data):
    staff, anna, admin = make_user("staff", "staff"), make_user("anna"), make_user("ola", "admin")
    Cocktail.objects.filter(pk=data.virgin.pk).update(author=anna, author_name="anna")
    r = Review.objects.create(author=anna, cocktail=data.mojito, rating=1, text="spam")
    ReviewReport.objects.create(review=r, reporter=admin, reason="spam")
    ReviewReport.objects.create(review=r, reporter=staff)
    body = as_user(staff).get(USERS).json()
    rows = {u["username"]: u for u in body["results"]}
    assert rows["anna"]["recipes"] == 1 and rows["anna"]["reviews"] == 1 and rows["anna"]["reports"] == 2
    assert rows["anna"]["can_edit"] is True and rows["anna"]["assignable_roles"] == ["user", "admin"]
    assert rows["ola"]["can_edit"] is True  # staff stoi wyżej od admina
    assert rows["staff"]["can_edit"] is False and rows["staff"]["assignable_roles"] == []  # nie siebie
    assert set(rows["anna"]) == {"id", "username", "role", "is_active", "date_joined", "recipes", "reviews", "reports", "can_edit", "assignable_roles"}
    assert "password" not in str(body) and "email" not in str(body)


def test_an_admin_can_only_see_the_user_role_as_assignable(make_user, as_user):
    admin, anna, other_admin = make_user("adm", "admin"), make_user("anna"), make_user("adm2", "admin")
    rows = {u["username"]: u for u in as_user(admin).get(USERS).json()["results"]}
    assert rows["anna"]["assignable_roles"] == ["user"] and rows["anna"]["can_edit"] is True
    assert rows["adm2"]["can_edit"] is False  # równy rangą


def test_the_user_list_can_be_searched_and_filtered_by_role(make_user, as_user):
    owner = make_user("boss", "owner")
    for name in ["kasia_mixuje", "kasia_b", "tomek"]:
        make_user(name)
    make_user("ola", "admin")
    client = as_user(owner)
    assert sorted(u["username"] for u in client.get(USERS, {"search": "KASIA"}).json()["results"]) == ["kasia_b", "kasia_mixuje"]
    assert [u["username"] for u in client.get(USERS, {"role": "admin"}).json()["results"]] == ["ola"]
    assert client.get(USERS, {"role": "wizard"}).status_code == 400


# =================== kolejka zgłoszeń ===================

def test_the_report_queue_lists_only_reported_reviews_most_reported_first(make_user, as_user, data):
    admin, a, b, c = make_user("adm", "admin"), make_user("a"), make_user("b"), make_user("c")
    quiet = Review.objects.create(author=a, cocktail=data.mojito, rating=5, text="ok")
    few = Review.objects.create(author=b, cocktail=data.mojito, rating=2, text="hmm")
    many = Review.objects.create(author=c, cocktail=data.virgin, rating=1, text="spam")
    ReviewReport.objects.create(review=few, reporter=a, reason="obraza")
    for reporter in (a, b, admin):
        ReviewReport.objects.create(review=many, reporter=reporter, reason=f"od {reporter.username}")
    body = as_user(admin).get(REPORTS).json()
    assert [r["id"] for r in body["results"]] == [many.id, few.id]  # opinia bez zgłoszeń się nie pojawia
    first = body["results"][0]
    assert first["report_count"] == 3 and first["author_username"] == "c" and first["cocktail"]["name"] == "Virgin Mojito"
    assert {x["reporter"] for x in first["reports"]} == {"a", "b", "adm"}
    assert quiet.id not in [r["id"] for r in body["results"]]


def test_dismissing_removes_the_reports_but_keeps_the_review(make_user, as_user, data):
    admin, a = make_user("adm", "admin"), make_user("a")
    review = Review.objects.create(author=a, cocktail=data.mojito, rating=1, text="x")
    ReviewReport.objects.create(review=review, reporter=admin)
    assert as_user(admin).post(f"{REPORTS}{review.id}/dismiss/").status_code == 204
    assert Review.objects.filter(pk=review.pk).exists() and not ReviewReport.objects.exists()
    assert as_user(admin).get(REPORTS).json()["results"] == []
    assert as_user(admin).post(f"{REPORTS}999999/dismiss/").status_code == 404


def test_an_admin_can_delete_a_reported_review_through_the_existing_endpoint(make_user, as_user, data):
    admin, a = make_user("adm", "admin"), make_user("a")
    review = Review.objects.create(author=a, cocktail=data.mojito, rating=1, text="spam")
    ReviewReport.objects.create(review=review, reporter=admin)
    assert as_user(admin).delete(f"/api/v1/reviews/{review.id}/").status_code == 204
    assert as_user(admin).get(REPORTS).json()["results"] == []  # zgłoszenia znikają razem z opinią


# =================== znaczek ===================

def test_verify_sets_and_clears_the_badge_in_bulk(admin_api, data):
    assert admin_api.post(VERIFY, {"ids": [data.virgin.id], "verified": True}, format="json").json() == {"updated": 1}
    data.virgin.refresh_from_db()
    assert data.virgin.verified
    assert admin_api.post(VERIFY, {"ids": [data.virgin.id, data.mojito.id], "verified": False}, format="json").json() == {"updated": 2}
    assert not Cocktail.objects.filter(pk__in=[data.virgin.id, data.mojito.id], verified=True).exists()


def test_verify_ignores_unknown_ids_and_validates_the_request(admin_api, data):
    assert admin_api.post(VERIFY, {"ids": [999999], "verified": True}, format="json").json() == {"updated": 0}
    for bad in [{}, {"ids": [], "verified": True}, {"ids": [1], "verified": "maybe"}, {"ids": ["x"], "verified": True}, {"ids": list(range(1, 202)), "verified": True}, {"verified": True}]:
        assert admin_api.post(VERIFY, bad, format="json").status_code == 400, bad


def test_an_author_still_cannot_verify_their_own_recipe(make_user, as_user, data):
    anna = make_user("anna")
    Cocktail.objects.filter(pk=data.virgin.pk).update(author=anna, author_name="anna")
    assert as_user(anna).post(VERIFY, {"ids": [data.virgin.id], "verified": True}, format="json").status_code == 403
    assert as_user(anna).patch(f"/api/v1/cocktails/{data.virgin.id}/", {"verified": True}, format="json").status_code == 200  # pole jest ignorowane
    data.virgin.refresh_from_db()
    assert not data.virgin.verified


# =================== pulpit ===================

def test_stats_count_what_needs_attention(make_user, as_user, data):
    admin, anna = make_user("adm", "admin"), make_user("anna")
    Cocktail.objects.filter(pk=data.virgin.pk).update(author=anna, author_name="anna")  # przepis użytkownika bez znaczka
    Cocktail.objects.filter(pk=data.shot.pk).update(image_url="https://cocktails.solvro.pl/a.png")
    review = Review.objects.create(author=anna, cocktail=data.mojito, rating=1)
    ReviewReport.objects.create(review=review, reporter=admin)
    today = timezone.localdate()
    CocktailView.objects.create(cocktail=data.mojito, day=today, visitor="a")
    CocktailView.objects.create(cocktail=data.mojito, day=today - timedelta(days=6), visitor="b")
    CocktailView.objects.create(cocktail=data.mojito, day=today - timedelta(days=7), visitor="c")  # poza oknem 7 dni
    s = as_user(admin).get(STATS).json()
    assert s["cocktails"] == 3 and s["unverified"] == 1 and s["pending_recipes"] == 1 and s["without_image"] == 2
    assert s["users"] == 2 and s["reported_reviews"] == 1
    assert len(s["views_by_day"]) == 7 and s["views_by_day"][-1] == {"day": str(today), "views": 1} and s["views_7d"] == 2
    assert s["top_cocktail"]["name"] == "Mojito" and s["top_cocktail"]["views_30d"] == 3
    assert [u["username"] for u in s["new_users"]] == ["anna", "adm"]


def test_stats_on_an_empty_database_do_not_crash(admin_api):
    s = admin_api.get(STATS).json()
    assert s["cocktails"] == 0 and s["top_cocktail"] is None and s["views_7d"] == 0 and len(s["views_by_day"]) == 7


# =================== filtr has_image (tabela koktajli w panelu) ===================

def test_has_image_filter_for_the_cocktail_table(api, data):
    Cocktail.objects.filter(pk=data.mojito.pk).update(image_url="https://cocktails.solvro.pl/m.png")
    names = lambda q: sorted(c["name"] for c in api.get(f"/api/v1/cocktails/?has_image={q}").json()["results"])
    assert names("true") == ["Mojito"]
    assert names("false") == ["Lemon Shot", "Virgin Mojito"]
    assert api.get("/api/v1/cocktails/?has_image=maybe").status_code == 400
