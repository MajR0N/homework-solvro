from datetime import timedelta

import pytest
from django.utils import timezone

from accounts.models import User
from cocktails.models import CocktailView

COCKTAILS = "/api/v1/cocktails/"


def count_url(cocktail):
    return f"{COCKTAILS}{cocktail.id}/views/"


def visit(client, cocktail, ip="203.0.113.5", **headers):
    return client.post(count_url(cocktail), REMOTE_ADDR=ip, **headers)


def rows(cocktail):
    return CocktailView.objects.filter(cocktail=cocktail).count()


# ---- liczenie i ochrona przed nabijaniem ----

def test_a_view_is_counted_once_per_visitor_per_day(api, data):
    assert visit(api, data.mojito).status_code == 204
    assert visit(api, data.mojito).status_code == 204  # powtórzenie: ta sama odpowiedź, nic nowego
    assert rows(data.mojito) == 1


def test_different_visitors_each_count_once(api, data):
    visit(api, data.mojito, ip="203.0.113.5")
    visit(api, data.mojito, ip="203.0.113.6")
    assert rows(data.mojito) == 2


def test_incognito_and_changed_browser_do_not_make_a_new_visitor(api, data):
    visit(api, data.mojito, HTTP_USER_AGENT="Chrome", HTTP_COOKIE="session=a")
    visit(api, data.mojito, HTTP_USER_AGENT="Firefox (private window)", HTTP_COOKIE="")
    visit(api, data.mojito, HTTP_USER_AGENT="curl/8", HTTP_ACCEPT_LANGUAGE="fr")
    assert rows(data.mojito) == 1


def test_a_spoofed_forwarded_for_header_is_ignored_without_trusted_proxies(api, data):
    visit(api, data.mojito, HTTP_X_FORWARDED_FOR="1.1.1.1")
    visit(api, data.mojito, HTTP_X_FORWARDED_FOR="2.2.2.2")
    visit(api, data.mojito, HTTP_X_FORWARDED_FOR="3.3.3.3, 4.4.4.4")
    assert rows(data.mojito) == 1


def test_forwarded_for_is_read_when_one_trusted_proxy_is_configured(api, data, settings):
    settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "NUM_PROXIES": 1}
    visit(api, data.mojito, ip="10.0.0.1", HTTP_X_FORWARDED_FOR="spoofed, 1.1.1.1")
    visit(api, data.mojito, ip="10.0.0.1", HTTP_X_FORWARDED_FOR="spoofed2, 1.1.1.1")  # ten sam prawdziwy klient
    visit(api, data.mojito, ip="10.0.0.1", HTTP_X_FORWARDED_FOR="spoofed, 2.2.2.2")
    assert rows(data.mojito) == 2


def test_ipv6_is_counted_by_its_64_bit_network(api, data):
    visit(api, data.mojito, ip="2001:db8:aaaa:1::1")
    visit(api, data.mojito, ip="2001:db8:aaaa:1:ffff:ffff:ffff:ffff")  # ta sama sieć /64: ten sam odwiedzający
    assert rows(data.mojito) == 1
    visit(api, data.mojito, ip="2001:db8:aaaa:2::1")  # inna sieć /64
    assert rows(data.mojito) == 2


def test_an_ipv4_mapped_ipv6_address_is_the_same_visitor_as_the_ipv4(api, data):
    visit(api, data.mojito, ip="203.0.113.5")
    visit(api, data.mojito, ip="::ffff:203.0.113.5")
    assert rows(data.mojito) == 1


def test_the_same_visitor_counts_again_on_a_new_day(api, data, monkeypatch):
    visit(api, data.mojito)
    tomorrow = timezone.localdate() + timedelta(days=1)  # z tego samego zegara co aplikacja (czas lokalny, nie UTC)
    monkeypatch.setattr(timezone, "localdate", lambda: tomorrow)
    visit(api, data.mojito)
    assert rows(data.mojito) == 2


def test_the_stored_identity_has_no_ip_and_differs_per_cocktail(api, data):
    visit(api, data.mojito, ip="203.0.113.5")
    visit(api, data.virgin, ip="203.0.113.5")
    stored = list(CocktailView.objects.values_list("visitor", flat=True))
    assert all(len(v) == 64 and "203.0.113" not in v for v in stored)
    assert stored[0] != stored[1]  # nie da się połączyć tej samej osoby między koktajlami


def test_the_authors_own_views_are_ignored_but_other_logged_in_users_count(make_user, as_user, data):
    anna = as_user(make_user("anna"))
    own = anna.post(COCKTAILS, {"name": "Mine", "category": "Cocktail"}, format="json").json()["id"]
    assert anna.post(f"{COCKTAILS}{own}/views/", REMOTE_ADDR="198.51.100.1").status_code == 204
    assert CocktailView.objects.filter(cocktail_id=own).count() == 0
    as_user(make_user("bob")).post(f"{COCKTAILS}{own}/views/", REMOTE_ADDR="198.51.100.2")
    assert CocktailView.objects.filter(cocktail_id=own).count() == 1


def test_unknown_cocktail_is_404_and_only_post_is_allowed(api, data):
    assert api.post(f"{COCKTAILS}999999/views/").status_code == 404
    assert api.get(count_url(data.mojito)).status_code == 405


def test_the_endpoint_is_throttled_per_ip(api, data):
    statuses = [visit(api, data.mojito, ip="203.0.113.9").status_code for _ in range(31)]
    assert statuses[:30] == [204] * 30 and statuses[30] == 429
    assert visit(api, data.mojito, ip="203.0.113.10").status_code == 204  # inny adres ma własny limit


# ---- etykiety ----

THRESHOLDS = {"trending_views_14d": 10, "popular_views_30d": 20, "most_popular_views_30d": 100}


@pytest.fixture(autouse=True)
def fixed_thresholds(settings):
    settings.LABEL_THRESHOLDS = THRESHOLDS  # testy nie zależą od zmiennych środowiskowych


def add_views(cocktail, *days_ago, per_day=1):
    """add_views(c, 0, 3) = jedno wyświetlenie dziś i jedno 3 dni temu; per_day = ilu różnych odwiedzających dziennie."""
    today = timezone.localdate()
    CocktailView.objects.bulk_create(
        CocktailView(cocktail=cocktail, day=today - timedelta(days=d), visitor=f"v{d}-{i}")
        for d in days_ago
        for i in range(per_day)
    )


def status_of(api, cocktail):
    body = api.get(f"{COCKTAILS}{cocktail.id}/").json()
    return body["status"], body["views_14d"], body["views_30d"]


def test_no_views_means_no_label(api, data):
    assert status_of(api, data.mojito) == (None, 0, 0)


def test_trending_needs_enough_views_and_a_rising_trend(api, data):
    add_views(data.mojito, 0, 1, 2, 3, 4, 5, 6)  # 7 w ostatnich 7 dniach
    add_views(data.mojito, 8, 9, 10, 11)  # 4 w 7 dniach wcześniej
    assert status_of(api, data.mojito) == ("trending", 11, 11)


def test_a_cocktail_that_stopped_rising_is_not_trending(api, data):
    add_views(data.mojito, 0, 1, 2, 3, 4)  # 5 w ostatnich 7 dniach
    add_views(data.mojito, 8, 9, 10, 11, 12, 13)  # 6 w 7 dniach wcześniej: razem 11, ale już nie rośnie
    assert status_of(api, data.mojito) == (None, 11, 11)


def test_not_enough_views_is_not_trending_even_if_rising(api, data):
    add_views(data.mojito, 0, 1, 2)  # rośnie (3 do 0), ale tylko 3 wyświetlenia (próg 10)
    assert status_of(api, data.mojito)[0] is None


def test_popular_after_the_burst_when_30_day_views_stay_above_the_bar(api, data):
    add_views(data.mojito, 16, 18, 20, 22, 24, 26, 28, per_day=3)  # 21 wyświetleń, wszystkie starsze niż 14 dni
    assert status_of(api, data.mojito) == ("popular", 0, 21)


def test_most_popular_above_the_higher_bar(api, data):
    add_views(data.mojito, 16, 18, 20, 22, 24, 26, 28, per_day=15)  # 105 wyświetleń, bez wzrostu
    assert status_of(api, data.mojito)[0] == "most_popular"


def test_trending_wins_over_the_other_labels_while_it_is_rising(api, data):
    add_views(data.mojito, 0, 1, 2, per_day=40)  # 120 w ostatnich dniach i nic wcześniej
    assert status_of(api, data.mojito)[0] == "trending"


def test_views_just_outside_the_window_do_not_count(api, data):
    add_views(data.mojito, 30, per_day=50)  # dokładnie 30 dni temu: poza oknem 30-dniowym
    assert status_of(api, data.mojito) == (None, 0, 0)
    add_views(data.virgin, 14, per_day=20)  # 14 dni temu: poza oknem 14-dniowym, ale w 30-dniowym
    assert status_of(api, data.virgin) == ("popular", 0, 20)


def test_the_same_numbers_appear_in_the_list_and_do_not_mix_up_cocktails(api, data):
    add_views(data.mojito, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
    add_views(data.virgin, 2)
    listed = {c["name"]: (c["status"], c["views_14d"]) for c in api.get(COCKTAILS).json()["results"]}
    assert listed["Mojito"] == ("trending", 12)
    assert listed["Virgin Mojito"] == (None, 1)
    assert listed["Lemon Shot"] == (None, 0)


def test_views_do_not_distort_the_review_numbers(api, make_user, as_user, data):
    for name, stars in [("a", 5), ("b", 3)]:
        as_user(make_user(name)).post(f"{COCKTAILS}{data.mojito.id}/reviews/", {"rating": stars}, format="json")
    add_views(data.mojito, 0, 1, 2, 3, 4, per_day=7)  # 35 wierszy wyświetleń obok 2 opinii
    body = api.get(f"{COCKTAILS}{data.mojito.id}/").json()
    assert (body["rating_avg"], body["rating_count"], body["views_30d"]) == (4.0, 2, 35)


def test_label_thresholds_are_read_from_settings(api, data, settings):
    add_views(data.mojito, 0, 1, 2)
    assert status_of(api, data.mojito)[0] is None
    settings.LABEL_THRESHOLDS = {**THRESHOLDS, "trending_views_14d": 3}
    assert status_of(api, data.mojito)[0] == "trending"


# ---- sortowanie i filtr ----

def names(response):
    return [c["name"] for c in response.json()["results"]]


def test_sort_by_popular_and_by_trending(api, data):
    add_views(data.mojito, 0, per_day=5)  # 5 wyświetleń, przyrost +5
    add_views(data.virgin, 20, per_day=9)  # 9 wyświetleń, przyrost 0
    assert names(api.get(COCKTAILS, {"ordering": "-popular"}))[:2] == ["Virgin Mojito", "Mojito"]
    assert names(api.get(COCKTAILS, {"ordering": "-trending"}))[0] == "Mojito"


def test_status_filter(api, data):
    add_views(data.mojito, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
    add_views(data.virgin, 20, per_day=21)
    assert names(api.get(COCKTAILS, {"status": "trending"})) == ["Mojito"]
    assert names(api.get(COCKTAILS, {"status": "popular"})) == ["Virgin Mojito"]
    assert api.get(COCKTAILS, {"status": "viral"}).status_code == 400


def test_top_rated_prefers_many_good_reviews_over_a_single_five_stars(api, make_user, as_user, data):
    def review(cocktail, stars, n):
        for _ in range(n):
            serial = User.objects.count()
            as_user(make_user(f"u{serial}")).post(f"{COCKTAILS}{cocktail.id}/reviews/", {"rating": stars}, format="json")

    review(data.mojito, 5, 16)
    review(data.mojito, 4, 4)  # 20 opinii, średnia 4.8
    review(data.virgin, 5, 1)  # jedna piątka, średnia 5.0
    review(data.shot, 3, 10)  # tło, które obniża średnią wszystkich ocen
    order = names(api.get(COCKTAILS, {"ordering": "-top_rated"}))
    assert order == ["Mojito", "Virgin Mojito", "Lemon Shot"]
    # sama średnia dałaby odwrotnie (5.0 > 4.8): przed tym chroni średnia ważona
    virgin = api.get(f"{COCKTAILS}{data.virgin.id}/").json()["rating_avg"]
    assert virgin > api.get(f"{COCKTAILS}{data.mojito.id}/").json()["rating_avg"]


def test_top_rated_puts_cocktails_without_reviews_last_even_after_a_bad_one(api, make_user, as_user, data):
    as_user(make_user("grumpy")).post(f"{COCKTAILS}{data.virgin.id}/reviews/", {"rating": 1}, format="json")  # jedna jedynka
    descending = names(api.get(COCKTAILS, {"ordering": "-top_rated"}))
    assert descending[0] == "Virgin Mojito"  # każda opinia, nawet zła, jest ponad brakiem opinii
    assert descending[1:] == ["Lemon Shot", "Mojito"]
    assert names(api.get(COCKTAILS, {"ordering": "top_rated"}))[-1] == "Virgin Mojito"


def test_top_rated_with_no_reviews_at_all_does_not_crash(api, data):
    assert api.get(COCKTAILS, {"ordering": "-top_rated"}).status_code == 200


@pytest.mark.parametrize("bad", ["views", "-glass", "popularity"])
def test_unknown_sorts_are_still_400(api, data, bad):
    assert api.get(COCKTAILS, {"ordering": bad}).status_code == 400
