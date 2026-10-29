import pytest
from django.test import Client
from rest_framework.throttling import SimpleRateThrottle

API = "/api/v1/cocktails/"
INGREDIENTS = "/api/v1/ingredients/"


@pytest.fixture
def rates(monkeypatch):
    """rates(anon="5/min") obniża limit na czas jednego testu, żeby nie trzeba było wysyłać setek żądań."""

    def set_rates(**new):
        for scope, rate in new.items():
            monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, scope, rate)

    return set_rates


def codes(client, n, method="get", url=API, **kwargs):
    return [getattr(client, method)(url, **kwargs).status_code for _ in range(n)]


def test_the_real_limits_are_the_documented_ones():
    # pilnuje, żeby nikt przypadkiem nie poluzował limitów (README opisuje dokładnie te wartości)
    assert {k: SimpleRateThrottle.THROTTLE_RATES[k] for k in ("anon", "user", "write", "auth", "refresh", "views")} == {
        "anon": "120/min", "user": "300/min", "write": "30/min", "auth": "10/min", "refresh": "30/min", "views": "30/min",
    }


def test_anonymous_visitors_are_limited_per_ip(api, data, rates):
    rates(anon="5/min", user="1000/min")
    result = codes(api, 6, REMOTE_ADDR="203.0.113.1")
    assert result == [200] * 5 + [429]
    assert api.get(API, REMOTE_ADDR="203.0.113.1")["Retry-After"]  # klient dowiaduje się, kiedy wrócić
    assert api.get(API, REMOTE_ADDR="203.0.113.2").status_code == 200  # inny adres ma własny limit


def test_logged_in_users_are_limited_per_account_not_per_ip(make_user, as_user, data, rates):
    rates(user="5/min", anon="1000/min")
    anna, bob = as_user(make_user("anna")), as_user(make_user("bob"))
    assert codes(anna, 6, REMOTE_ADDR="203.0.113.1") == [200] * 5 + [429]
    assert bob.get(API, REMOTE_ADDR="203.0.113.1").status_code == 200  # ten sam adres, inne konto


def test_writes_have_a_stricter_limit_that_reads_do_not_use_up(user_api, admin_api, data, rates):
    rates(write="3/min", user="1000/min")
    created = [user_api.post(INGREDIENTS, {"name": f"Syrup {i}"}, format="json").status_code for i in range(4)]
    assert created == [201, 201, 201, 429]
    assert user_api.get(INGREDIENTS).status_code == 200  # odczyty nie są liczone jako zapisy
    assert admin_api.post(INGREDIENTS, {"name": "Other"}, format="json").status_code == 201  # inne konto ma własny limit


def test_the_write_limit_is_shared_by_every_write_endpoint(user_api, data, rates):
    rates(write="3/min", user="1000/min")
    assert user_api.post(INGREDIENTS, {"name": "A"}, format="json").status_code == 201
    assert user_api.post(f"{API}{data.mojito.id}/reviews/", {"rating": 5}, format="json").status_code == 201
    assert user_api.post(f"{API}{data.virgin.id}/reviews/", {"rating": 4}, format="json").status_code == 201
    assert user_api.post(API, {"name": "New", "category": "Cocktail"}, format="json").status_code == 429
    assert user_api.post("/api/v1/reviews/1/report/", {}, format="json").status_code == 429


def test_refreshing_and_logging_out_tokens_is_limited(api, data, rates):
    rates(refresh="3/min", auth="1000/min")
    api.post("/api/v1/auth/register/", {"username": "anna", "password": "Sup3r-secret-pw"}, format="json")
    token = api.post("/api/v1/auth/login/", {"username": "anna", "password": "Sup3r-secret-pw"}, format="json").json()["refresh"]
    refresh = codes(api, 4, method="post", url="/api/v1/auth/refresh/", data={"refresh": token}, format="json")
    assert refresh[3] == 429 and 429 not in refresh[:3]
    assert api.post("/api/v1/auth/logout/", {"refresh": token}, format="json").status_code == 429  # wspólny limit


def test_the_admin_login_page_is_limited_per_ip(db, settings):
    settings.ADMIN_LOGIN_ATTEMPTS_PER_MINUTE = 3
    client = Client(REMOTE_ADDR="203.0.113.1")
    attempts = [client.post("/admin/login/", {"username": "root", "password": f"guess{i}"}).status_code for i in range(4)]
    assert attempts == [200, 200, 200, 429]
    assert client.post("/admin/login/", {"username": "root", "password": "again"})["Retry-After"] == "60"
    assert client.get("/admin/login/").status_code == 200  # samo otwarcie strony nie jest liczone
    assert Client(REMOTE_ADDR="203.0.113.2").post("/admin/login/", {"username": "root", "password": "x"}).status_code == 200


def test_the_admin_limit_cannot_be_dodged_with_a_spoofed_header(db, settings):
    settings.ADMIN_LOGIN_ATTEMPTS_PER_MINUTE = 2
    client = Client(REMOTE_ADDR="203.0.113.1")
    attempts = [
        client.post("/admin/login/", {"username": "root", "password": "x"}, HTTP_X_FORWARDED_FOR=f"10.0.0.{i}").status_code
        for i in range(3)
    ]
    assert attempts == [200, 200, 429]
