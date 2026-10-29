import json
import os
import subprocess
import sys

import pytest
from django.conf import settings as django_settings
from django.contrib.auth.hashers import make_password
from django.test import Client

from accounts.models import User

# prawdziwa lista haszerów z ustawień; test_* zastępują ją szybkim MD5 (conftest), więc zapamiętujemy ją przed tym
REAL_HASHERS = list(django_settings.PASSWORD_HASHERS)
BASE = django_settings.BASE_DIR
PRODUCTION_ENV = {
    "DEBUG": "false", "PRODUCTION": "true", "ALLOWED_HOSTS": "api.example.com",
    "CORS_ALLOWED_ORIGINS": "https://app.example.com", "NUM_PROXIES": "1",
}


# ---- hasła ----

def test_the_configured_password_hashers_are_argon2_first():
    assert REAL_HASHERS[0].endswith("Argon2PasswordHasher")


def test_new_passwords_are_hashed_with_memory_hard_argon2(db, settings):
    settings.PASSWORD_HASHERS = REAL_HASHERS
    user = User.objects.create_user("anna", password="Sup3r-secret-pw")
    other = User.objects.create_user("bob", password="Sup3r-secret-pw")
    assert user.password.startswith("argon2$argon2id$")
    assert "m=65536,t=3,p=2" in user.password  # 64 MiB pamięci, 3 przebiegi, 2 wątki (accounts/hashers.py)
    assert "Sup3r-secret-pw" not in user.password
    assert user.password != other.password  # losowa sól: to samo hasło daje inny hash
    assert user.check_password("Sup3r-secret-pw") and not user.check_password("wrong-password-1")


def test_old_pbkdf2_hashes_still_work_and_upgrade_to_argon2_at_login(api, db, settings):
    settings.PASSWORD_HASHERS = REAL_HASHERS
    user = User.objects.create_user("anna")
    user.password = make_password("Sup3r-secret-pw", hasher="pbkdf2_sha256")
    user.save()
    assert user.password.startswith("pbkdf2_sha256$")
    response = api.post("/api/v1/auth/login/", {"username": "anna", "password": "Sup3r-secret-pw"}, format="json")
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.password.startswith("argon2$")  # zamieniony przy logowaniu, bez udziału użytkownika


def test_the_jwt_carries_no_personal_data(api, make_user):
    import base64

    make_user("anna")
    token = api.post("/api/v1/auth/login/", {"username": "anna", "password": "Sup3r-secret-pw"}, format="json").json()["access"]
    payload = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
    assert set(payload) == {"token_type", "exp", "iat", "jti", "user_id"}  # sam numer konta: ani nazwy, ani roli


# ---- tryb produkcyjny ----

def django_run(*args, **env):
    full = {**os.environ, "DEBUG": "false", "PRODUCTION": "false", **env}
    return subprocess.run([sys.executable, "manage.py", *args], capture_output=True, text=True, cwd=BASE, env=full, encoding="utf-8", errors="replace")


def read_settings(**env):
    code = ("import json, django; django.setup(); from django.conf import settings as s; print(json.dumps({k: getattr(s, k, None) "
            "for k in ('SECURE_SSL_REDIRECT','SECURE_HSTS_SECONDS','SESSION_COOKIE_SECURE','CSRF_COOKIE_SECURE','SECURE_PROXY_SSL_HEADER','DB_SSLMODE')}))")
    full = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings", "DEBUG": "false", "PRODUCTION": "false", **env}
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, cwd=BASE, env=full, encoding="utf-8", errors="replace")
    assert out.returncode == 0, out.stderr[-500:]
    return json.loads(out.stdout.strip().splitlines()[-1])


def test_development_mode_has_no_https_enforcement():
    assert not django_settings.PRODUCTION and django_settings.SECURE_SSL_REDIRECT is False and django_settings.SECURE_HSTS_SECONDS == 0


def test_production_mode_turns_on_https_hsts_and_secure_cookies():
    s = read_settings(**PRODUCTION_ENV)
    assert s["SECURE_SSL_REDIRECT"] is True and s["SECURE_HSTS_SECONDS"] >= 365 * 24 * 3600
    assert s["SESSION_COOKIE_SECURE"] is True and s["CSRF_COOKIE_SECURE"] is True
    assert s["SECURE_PROXY_SSL_HEADER"] == ["HTTP_X_FORWARDED_PROTO", "https"]


def test_the_https_proxy_header_is_trusted_only_when_a_proxy_is_declared():
    assert read_settings(**{**PRODUCTION_ENV, "NUM_PROXIES": "0"})["SECURE_PROXY_SSL_HEADER"] is None  # inaczej klient mógłby udawać HTTPS


def test_djangos_own_deployment_check_is_clean_in_production_mode():
    result = django_run("check", "--deploy", **PRODUCTION_ENV)
    assert result.returncode == 0 and "no issues" in result.stdout + result.stderr


def test_production_refuses_to_start_with_debug_on():
    result = django_run("check", **{**PRODUCTION_ENV, "DEBUG": "true"})
    assert result.returncode != 0 and "PRODUCTION=true" in result.stderr


@pytest.mark.parametrize("missing", ["ALLOWED_HOSTS", "CORS_ALLOWED_ORIGINS"])
def test_production_refuses_to_start_with_local_defaults_left_in_place(missing):
    env = {k: v for k, v in PRODUCTION_ENV.items() if k != missing}
    full = {**os.environ, **env}
    full.pop(missing, None)  # zmienna z procesu testowego (np. z .env) też nie może jej uzupełnić
    result = subprocess.run([sys.executable, "manage.py", "check"], capture_output=True, text=True, cwd=BASE, env=full, encoding="utf-8", errors="replace")
    assert result.returncode != 0 and missing in result.stderr


def test_with_these_settings_http_is_redirected_and_https_gets_hsts(db, settings):
    settings.SECURE_SSL_REDIRECT = True
    settings.SECURE_HSTS_SECONDS = 31536000
    settings.SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    client = Client()  # nowy klient wczytuje middleware już z tymi ustawieniami
    plain = client.get("/api/v1/categories/")
    assert plain.status_code == 301 and plain["Location"].startswith("https://")
    secure = client.get("/api/v1/categories/", secure=True)
    assert secure.status_code == 200
    assert "max-age=31536000" in secure["Strict-Transport-Security"] and "includeSubDomains" in secure["Strict-Transport-Security"]


# ---- parametry Argon2 ----

def run_code(code, **env):
    full = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings", "DEBUG": "false", "PRODUCTION": "false", **env}
    return subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, cwd=BASE, env=full, encoding="utf-8", errors="replace")


HASH_CODE = "import django; django.setup(); from django.contrib.auth.hashers import make_password; print(make_password('x'))"


def test_argon2_parameters_can_be_tuned_with_environment_variables():
    result = run_code(HASH_CODE, ARGON2_MEMORY_KIB="32768", ARGON2_TIME_COST="2", ARGON2_PARALLELISM="1")
    assert result.returncode == 0 and "m=32768,t=2,p=1" in result.stdout


@pytest.mark.parametrize("name, value", [("ARGON2_MEMORY_KIB", "1024"), ("ARGON2_TIME_COST", "0"), ("ARGON2_PARALLELISM", "0"), ("ARGON2_MEMORY_KIB", "lots")])
def test_dangerously_weak_or_invalid_argon2_settings_stop_the_server(name, value):
    result = run_code(HASH_CODE, **{name: value})
    assert result.returncode != 0 and name in result.stderr


def test_argon2_hashes_made_with_other_parameters_still_verify_and_upgrade_at_login(api, db, settings):
    from django.contrib.auth.hashers import Argon2PasswordHasher

    settings.PASSWORD_HASHERS = REAL_HASHERS
    user = User.objects.create_user("anna")
    user.password = make_password("Sup3r-secret-pw", hasher=Argon2PasswordHasher())  # parametry domyślne Django: m=102400,t=2,p=8
    user.save()
    assert "m=102400,t=2,p=8" in user.password
    assert api.post("/api/v1/auth/login/", {"username": "anna", "password": "Sup3r-secret-pw"}, format="json").status_code == 200
    user.refresh_from_db()
    assert "m=65536,t=3,p=2" in user.password


# ---- szyfrowanie połączenia z bazą ----

def test_the_local_default_is_to_try_tls_without_requiring_it():
    assert django_settings.DATABASES["default"]["OPTIONS"]["sslmode"] == "prefer"


def test_production_requires_tls_to_the_database_by_default():
    assert read_settings(**PRODUCTION_ENV)["DB_SSLMODE"] == "require"


def test_production_accepts_the_strong_modes():
    assert read_settings(**{**PRODUCTION_ENV, "DB_SSLMODE": "verify-full"})["DB_SSLMODE"] == "verify-full"


@pytest.mark.parametrize("mode", ["disable", "allow", "prefer"])
def test_production_refuses_to_start_with_a_database_mode_that_can_fall_back_to_plain_text(mode):
    result = django_run("check", **{**PRODUCTION_ENV, "DB_SSLMODE": mode})
    assert result.returncode != 0 and "DB_SSLMODE" in result.stderr


def test_an_unknown_database_ssl_mode_stops_the_server():
    result = django_run("check", DB_SSLMODE="sure-why-not")
    assert result.returncode != 0 and "DB_SSLMODE" in result.stderr


def test_require_really_makes_the_driver_refuse_a_server_without_tls(db):
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute("SHOW ssl")
        if cursor.fetchone()[0] == "on":
            pytest.skip("ten serwer baz danych ma TLS, więc nie da się pokazać odmowy")
    code = "import django; django.setup(); from django.db import connection; connection.cursor()"
    result = run_code(code, DB_SSLMODE="require")
    assert result.returncode != 0 and "SSL was required" in result.stderr
