from datetime import date

import pytest
from django.test import RequestFactory
from rest_framework.throttling import BaseThrottle, SimpleRateThrottle

from accounts.middleware import TrustedClientIP
from cocktails.visitors import visitor_id

SECRET = "s" * 40
LOGIN = "/api/v1/auth/login/"
API = "/api/v1/cocktails/"


@pytest.fixture(autouse=True)
def proxy_secret(settings):
    settings.PROXY_SECRET = SECRET


def via_proxy(ip, secret=SECRET, **extra):
    """Nagłówki, które dopisuje proxy we frontendzie; REMOTE_ADDR to adres serwera Next.js."""
    return {"REMOTE_ADDR": "198.51.100.7", "HTTP_X_CLIENT_IP": ip, "HTTP_X_PROXY_SECRET": secret, **extra}


def ident(**headers):
    """Adres klienta, jaki zobaczy DRF (limity, wyświetlenia) po przejściu przez TrustedClientIP."""
    seen = {}

    def grab(request):
        seen["ip"] = BaseThrottle().get_ident(request)

    TrustedClientIP(grab)(RequestFactory().get("/", **headers))
    return seen["ip"]


def test_the_client_ip_comes_from_the_proxy_header_when_the_secret_matches():
    assert ident(**via_proxy("203.0.113.9")) == "203.0.113.9"
    assert ident(**via_proxy("2001:db8::1")) == "2001:db8::1"


def test_the_client_ip_also_works_behind_a_hosting_proxy_counted_by_num_proxies(settings):
    settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, "NUM_PROXIES": 1}
    from rest_framework.settings import api_settings

    api_settings.reload()
    try:
        assert ident(**via_proxy("203.0.113.9", HTTP_X_FORWARDED_FOR="198.51.100.7")) == "203.0.113.9"
    finally:
        api_settings.reload()


def test_two_users_behind_the_proxy_have_separate_login_limits(db, api, monkeypatch):
    monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "auth", "3/min")
    bad = {"username": "nobody", "password": "x"}
    first = [api.post(LOGIN, bad, format="json", **via_proxy("203.0.113.1")).status_code for _ in range(4)]
    assert first[-1] == 429  # pierwszy użytkownik zablokowany po limicie
    assert api.post(LOGIN, bad, format="json", **via_proxy("203.0.113.2")).status_code != 429  # drugi ma swój licznik


def test_a_wrong_or_missing_secret_means_the_header_is_ignored(db, api, monkeypatch):
    monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "auth", "3/min")
    bad = {"username": "nobody", "password": "x"}
    # atakujący zmienia X-Client-IP, żeby omijać limit, ale nie zna sekretu: wszystko liczy się na adres połączenia
    codes = [api.post(LOGIN, bad, format="json", **via_proxy(f"203.0.113.{i}", secret="wrong")).status_code for i in range(1, 5)]
    assert codes[-1] == 429
    no_secret = {"REMOTE_ADDR": "198.51.100.8", "HTTP_X_CLIENT_IP": "203.0.113.50"}
    codes = [api.post(LOGIN, bad, format="json", **{**no_secret, "HTTP_X_CLIENT_IP": f"203.0.113.{i}"}).status_code for i in range(1, 5)]
    assert codes[-1] == 429


def test_the_feature_is_off_without_a_configured_secret(db, api, settings, monkeypatch):
    settings.PROXY_SECRET = ""
    monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "auth", "3/min")
    bad = {"username": "nobody", "password": "x"}
    codes = [api.post(LOGIN, bad, format="json", **via_proxy(f"203.0.113.{i}", secret="")).status_code for i in range(1, 5)]
    assert codes[-1] == 429  # pusty sekret w żądaniu nie może "pasować" do pustego sekretu w ustawieniach


def test_a_garbage_client_ip_falls_back_to_the_connection_address(db, api, monkeypatch):
    monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "auth", "3/min")
    bad = {"username": "nobody", "password": "x"}
    codes = [api.post(LOGIN, bad, format="json", **via_proxy("not-an-ip")).status_code for _ in range(4)]
    assert codes[-1] == 429


def test_the_view_counter_sees_the_real_visitor_not_the_proxy():
    def visitor(ip):
        seen = {}
        request = RequestFactory().get("/", **via_proxy(ip))
        TrustedClientIP(lambda r: seen.setdefault("id", visitor_id(r, 1, date(2026, 10, 30))))(request)
        return seen["id"]

    assert visitor("203.0.113.1") != visitor("203.0.113.2")  # różni odwiedzający za tym samym proxy
    assert visitor("203.0.113.1") == visitor("203.0.113.1")


def test_a_short_secret_is_refused_at_startup(monkeypatch):
    import importlib

    from django.core.exceptions import ImproperlyConfigured

    import config.settings as settings_module

    monkeypatch.setenv("PROXY_SECRET", "too-short")
    with pytest.raises(ImproperlyConfigured):
        importlib.reload(settings_module)
    monkeypatch.delenv("PROXY_SECRET")
    importlib.reload(settings_module)
