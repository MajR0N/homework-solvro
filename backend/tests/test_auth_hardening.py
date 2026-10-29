import logging
import subprocess
import sys

import jwt
import pytest
from django.conf import settings
from django.core.cache import cache
from django.test import override_settings

from accounts.models import User

LOGIN = "/api/v1/auth/login/"
REGISTER = "/api/v1/auth/register/"
ME = "/api/v1/auth/me/"
GOOD = "Sup3r-secret-pw"
BAD = "wrong-password-1"


def login(api, username="anna", password=BAD, **extra):
    return api.post(LOGIN, {"username": username, "password": password}, format="json", **extra)


@pytest.fixture
def anna(make_user):
    return make_user("anna")


# ---- blokada konta po serii błędów ----

def test_five_failures_lock_the_account_even_for_the_correct_password(api, anna):
    assert [login(api).status_code for _ in range(5)] == [401] * 5
    locked = login(api, password=GOOD)
    assert locked.status_code == 429 and locked["Retry-After"] == "900"


def test_the_lock_is_per_username_not_per_ip(api, anna, make_user):
    make_user("bob")
    for _ in range(5):
        login(api, REMOTE_ADDR="203.0.113.1")
    assert login(api, password=GOOD, REMOTE_ADDR="203.0.113.99").status_code == 429  # inny adres nie pomaga atakującemu
    assert login(api, username="bob", password=GOOD, REMOTE_ADDR="203.0.113.1").status_code == 200  # inne konto działa


def test_the_lock_does_not_reveal_which_usernames_exist(api, anna):
    # każda połowa z innego adresu IP, żeby limit na IP (10 na minutę) nie mieszał się z blokadą konta
    real = [login(api, username="anna", REMOTE_ADDR="203.0.113.1").status_code for _ in range(7)]
    fake = [login(api, username="nobody-here", REMOTE_ADDR="203.0.113.2").status_code for _ in range(7)]
    assert real == fake == [401] * 5 + [429] * 2


@pytest.mark.parametrize("variant", ["ANNA", "Anna", "aNNa"])
def test_changing_the_letter_case_does_not_dodge_the_counter(api, anna, variant):
    for _ in range(3):
        login(api, username="anna")
    for _ in range(2):
        login(api, username=variant)
    assert login(api, username="anna", password=GOOD).status_code == 429


def test_a_successful_login_resets_the_counter(api, anna):
    for _ in range(4):
        login(api)
    assert login(api, password=GOOD).status_code == 200
    for _ in range(4):
        login(api)
    assert login(api, password=GOOD).status_code == 200  # nie 429: licznik zaczął od zera


def test_the_lock_ends_when_the_window_expires(api, anna):
    for _ in range(5):
        login(api)
    assert login(api, password=GOOD).status_code == 429
    cache.clear()  # tak samo wygląda koniec okna: licznik znika
    assert login(api, password=GOOD).status_code == 200


def test_attempts_during_the_lock_do_not_extend_it(api, anna):
    for _ in range(5):
        login(api)
    key = "login-fail:anna"
    assert cache.get(key) == 5
    for _ in range(3):
        login(api)
    assert cache.get(key) == 5


def test_malformed_login_bodies_do_not_crash_or_count(api, anna):
    assert api.post(LOGIN, [1, 2, 3], format="json").status_code == 400
    assert api.post(LOGIN, {"username": ["x"], "password": 5}, format="json").status_code == 400
    assert api.post(LOGIN, {}, format="json").status_code == 400
    assert cache.get("login-fail:anna") is None


# ---- polityka haseł ----

def register(api, username="newbie", password=GOOD):
    return api.post(REGISTER, {"username": username, "password": password}, format="json")


@pytest.mark.parametrize("password, ok", [
    ("Abcdefg1x", False),          # 9 znaków
    ("Abcdefg1xy", True),          # 10 znaków
    ("x" * 128, True),
    ("x" * 129, False),            # za długie: nie marnujemy czasu na hashowanie
    ("1234567890123", False),      # same cyfry
    ("password123", False),        # z listy popularnych haseł
])
def test_password_length_and_quality_rules(api, db, password, ok):
    assert (register(api, password=password).status_code == 201) is ok


def test_a_password_too_similar_to_the_username_is_rejected(api, db):
    response = register(api, username="anna_kowalska", password="anna_kowalska1")
    assert response.status_code == 400 and "password" in response.json()
    assert register(api, username="anna_kowalska", password="Zupelnie-inne-haslo-7").status_code == 201


# ---- klucz podpisujący JWT ----

def test_tokens_are_signed_with_their_own_key_not_the_django_secret(api, anna):
    token = login(api, password=GOOD).json()["access"]
    assert jwt.decode(token, settings.JWT_SIGNING_KEY, algorithms=["HS256"])["user_id"] == str(anna.pk)
    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    assert settings.JWT_SIGNING_KEY != settings.SECRET_KEY


def test_a_token_forged_with_the_django_secret_is_refused(api, anna):
    forged = jwt.encode({"token_type": "access", "user_id": str(anna.pk), "exp": 4102444800, "jti": "x"}, settings.SECRET_KEY, algorithm="HS256")
    api.credentials(HTTP_AUTHORIZATION="Bearer " + forged)
    assert api.get(ME).status_code == 401


def test_other_algorithms_are_refused(api, anna):
    for alg_token in (
        jwt.encode({"token_type": "access", "user_id": str(anna.pk), "exp": 4102444800, "jti": "x"}, settings.JWT_SIGNING_KEY, algorithm="HS512"),
        jwt.encode({"token_type": "access", "user_id": str(anna.pk), "exp": 4102444800, "jti": "x"}, None, algorithm="none"),
    ):
        api.credentials(HTTP_AUTHORIZATION="Bearer " + alg_token)
        assert api.get(ME).status_code == 401


def test_a_short_signing_key_stops_the_server_from_starting():
    code = "import os; os.environ['JWT_SIGNING_KEY'] = 'too-short'; import config.settings"
    result = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, cwd=settings.BASE_DIR)
    assert result.returncode != 0 and "JWT_SIGNING_KEY" in result.stderr


# ---- dziennik zdarzeń bezpieczeństwa ----

def test_failed_and_blocked_logins_are_logged_without_secrets(api, anna, caplog):
    caplog.set_level(logging.INFO, logger="security")
    login(api, username="anna", password="my-secret-typo-9")
    login(api, username="stranger-with-pass-hunter2", password="another-secret-1")
    for _ in range(5):
        login(api)
    login(api, password=GOOD)
    text = "\n".join(r.getMessage() for r in caplog.records if r.name == "security")
    assert "logowanie nieudane" in text and "logowanie zablokowane" in text
    for secret in ("my-secret-typo-9", "another-secret-1", "hunter2", GOOD, "stranger"):
        assert secret not in text  # ani hasła, ani wpisanej (być może pomylonej z hasłem) nazwy


def test_successful_logins_and_denials_are_logged(api, anna, make_user, as_user, data, caplog):
    caplog.set_level(logging.INFO, logger="security")
    login(api, password=GOOD)
    as_user(make_user("bob")).delete(f"/api/v1/cocktails/{data.mojito.id}/")  # cudzy wpis: 403
    text = "\n".join(r.getMessage() for r in caplog.records if r.name == "security")
    assert "logowanie udane" in text
    assert "403 DELETE" in text and "konto=" in text


def test_throttled_requests_are_logged_as_429(api, data, caplog, monkeypatch):
    from rest_framework.throttling import SimpleRateThrottle

    monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "anon", "1/min")
    caplog.set_level(logging.INFO, logger="security")
    api.get("/api/v1/cocktails/")
    api.get("/api/v1/cocktails/")
    assert any("429 GET" in r.getMessage() for r in caplog.records if r.name == "security")
