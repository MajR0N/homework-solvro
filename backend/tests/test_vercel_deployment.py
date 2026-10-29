import importlib
import json
import os
import secrets
import shutil
import subprocess
import sys

import pytest
from django.conf import settings as django_settings
from django.core.management import call_command
from django.db import connection

BASE = django_settings.BASE_DIR
NEON = "postgresql://neon_user:p%40ss%2Fw%3Ard@ep-cool-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
# klucze są losowe, tak jak na prawdziwym serwerze (Django ostrzega przed słabym SECRET_KEY)
VERCEL_ENV = {
    "SECRET_KEY": secrets.token_urlsafe(64), "JWT_SIGNING_KEY": secrets.token_urlsafe(64), "DATABASE_URL": NEON, "PRODUCTION": "true", "DEBUG": "false",
    "ALLOWED_HOSTS": "api-homework.vercel.app", "CORS_ALLOWED_ORIGINS": "https://homework-solvro.vercel.app", "NUM_PROXIES": "1",
}
# wszystko, co mogłoby przyjść z lokalnego pliku .env albo z procesu testów, a na Vercelu nie istnieje
OUR_VARIABLES = {
    "SECRET_KEY", "JWT_SIGNING_KEY", "DATABASE_URL", "PRODUCTION", "DEBUG", "ALLOWED_HOSTS", "CORS_ALLOWED_ORIGINS", "NUM_PROXIES",
    "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_SSLMODE", "CSRF_TRUSTED_ORIGINS",
    "ARGON2_MEMORY_KIB", "ARGON2_TIME_COST", "ARGON2_PARALLELISM",
}


def env_for(extra, remove=()):
    env = {k: v for k, v in os.environ.items() if k not in OUR_VARIABLES}
    env.update(extra)
    for key in remove:
        env.pop(key, None)
    return env


def run(args, env, cwd=BASE):
    return subprocess.run([sys.executable, *args], capture_output=True, text=True, cwd=cwd, env=env, encoding="utf-8", errors="replace")


def settings_json(expr, extra):
    code = f"import json, django; django.setup(); from django.conf import settings as s; print(json.dumps({expr}, default=str))"
    result = run(["-c", code], {**env_for({"DEBUG": "false", "PRODUCTION": "false", **extra}), "DJANGO_SETTINGS_MODULE": "config.settings",
                                "DB_PASSWORD": "local-only"})
    assert result.returncode == 0, result.stderr[-600:]
    return json.loads(result.stdout.strip().splitlines()[-1])


# ---- adres bazy z hostingu ----

def test_database_url_is_read_including_an_encoded_password_and_the_pooler_flag():
    db = settings_json("s.DATABASES['default']", {"DATABASE_URL": NEON})
    assert (db["NAME"], db["USER"], db["HOST"], db["PORT"]) == ("neondb", "neon_user", "ep-cool-pooler.eu-central-1.aws.neon.tech", 5432)
    assert db["PASSWORD"] == "p@ss/w:rd"  # %40 -> @, %2F -> /, %3A -> :
    assert db["OPTIONS"] == {"channel_binding": "require", "sslmode": "require"}
    assert db["DISABLE_SERVER_SIDE_CURSORS"] is True  # adres puli połączeń (PgBouncer)


def test_a_direct_database_address_keeps_server_side_cursors_and_honours_the_port():
    db = settings_json("s.DATABASES['default']", {"DATABASE_URL": "postgresql://u:p@ep-direct.neon.tech:6543/db"})
    assert db["PORT"] == 6543 and db["DISABLE_SERVER_SIDE_CURSORS"] is False


def test_the_ssl_mode_from_the_url_is_used_and_the_environment_variable_wins():
    url = "postgresql://u:p@host.example.com/db?sslmode=verify-full"
    assert settings_json("s.DB_SSLMODE", {"DATABASE_URL": url}) == "verify-full"
    assert settings_json("s.DB_SSLMODE", {"DATABASE_URL": url, "DB_SSLMODE": "require"}) == "require"


def test_production_without_a_mode_in_the_url_requires_tls():
    extra = {k: v for k, v in VERCEL_ENV.items() if k != "DATABASE_URL"}
    assert settings_json("s.DB_SSLMODE", {**extra, "DATABASE_URL": "postgresql://u:p@host.example.com/db"}) == "require"


def test_production_refuses_a_database_url_that_asks_for_no_encryption():
    env = env_for({**VERCEL_ENV, "DATABASE_URL": "postgresql://u:p@host.example.com/db?sslmode=disable"})
    result = run(["manage.py", "check"], env)
    assert result.returncode != 0 and "DB_SSLMODE" in result.stderr


def test_a_database_url_for_another_kind_of_database_is_refused():
    env = env_for({**VERCEL_ENV, "DATABASE_URL": "mysql://u:p@host.example.com/db"})
    result = run(["manage.py", "check"], env)
    assert result.returncode != 0 and "DATABASE_URL" in result.stderr


# ---- pliki statyczne, cache, adresy ----

def test_static_files_for_the_admin_can_be_collected():
    result = run(["manage.py", "collectstatic", "--noinput", "--dry-run"], env_for({"DEBUG": "false", "DB_PASSWORD": "x", "SECRET_KEY": secrets.token_urlsafe(64), "JWT_SIGNING_KEY": secrets.token_urlsafe(64)}))
    assert result.returncode == 0, result.stderr[-400:]
    assert "admin" in result.stdout and django_settings.STATIC_ROOT.name == "staticfiles"


def test_production_uses_a_shared_cache_and_development_does_not_need_one():
    assert settings_json("s.CACHES['default']['BACKEND']", VERCEL_ENV).endswith("DatabaseCache")
    assert settings_json("s.CACHES['default']['BACKEND']", {}).endswith("LocMemCache")


def test_csrf_trusted_origins_come_from_the_environment():
    assert settings_json("s.CSRF_TRUSTED_ORIGINS", {"CSRF_TRUSTED_ORIGINS": "https://a.example.com, https://b.example.com"}) == ["https://a.example.com", "https://b.example.com"]
    assert settings_json("s.CSRF_TRUSTED_ORIGINS", {}) == []


def test_the_login_lock_and_the_limits_work_on_the_shared_database_cache(api, make_user, settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.db.DatabaseCache", "LOCATION": "django_cache"}}
    call_command("createcachetable")
    make_user("anna")
    login = lambda pw, ip: api.post("/api/v1/auth/login/", {"username": "anna", "password": pw}, format="json", REMOTE_ADDR=ip).status_code
    assert [login("wrong-password-1", f"203.0.113.{i}") for i in range(5)] == [401] * 5  # różne adresy: liczy się nazwa konta
    assert login("Sup3r-secret-pw", "203.0.113.99") == 429
    with connection.cursor() as cursor:
        cursor.execute("select count(*) from django_cache")
        assert cursor.fetchone()[0] > 0  # liczniki naprawdę leżą w bazie, a nie w pamięci procesu


# ---- próba generalna budowania na Vercelu ----

@pytest.fixture
def clean_copy(tmp_path):
    """Kopia backendu tak, jak trafia na Vercel: bez .env, bez .venv, bez bazy i bez żadnych lokalnych sekretów."""
    target = tmp_path / "backend"
    shutil.copytree(BASE, target, ignore=shutil.ignore_patterns(".venv", ".env", "__pycache__", "staticfiles", "tests", ".pytest_cache"))
    assert not (target / ".env").exists()
    return target


def test_vercel_can_start_and_collect_static_files_with_only_its_own_variables(clean_copy):
    env = env_for(VERCEL_ENV)
    deploy = run(["manage.py", "check", "--deploy"], env, cwd=clean_copy)
    assert deploy.returncode == 0 and "no issues" in deploy.stdout + deploy.stderr, deploy.stderr[-600:]
    collect = run(["manage.py", "collectstatic", "--noinput"], env, cwd=clean_copy)
    assert collect.returncode == 0, collect.stderr[-600:]
    assert (clean_copy / "staticfiles" / "admin" / "css").is_dir()


@pytest.mark.parametrize("missing", ["SECRET_KEY", "JWT_SIGNING_KEY", "ALLOWED_HOSTS", "CORS_ALLOWED_ORIGINS"])
def test_a_missing_variable_stops_the_build_with_a_clear_error(clean_copy, missing):
    result = run(["manage.py", "check"], env_for(VERCEL_ENV, remove=[missing]), cwd=clean_copy)
    assert result.returncode != 0 and missing in result.stderr  # to jest dokładnie ten błąd, który widać w logu Vercela


def test_the_django_entrypoint_vercel_looks_for_exists():
    assert django_settings.WSGI_APPLICATION == "config.wsgi.application"
    assert callable(importlib.import_module("config.wsgi").application)
    assert (BASE / ".python-version").read_text().strip() in {"3.12", "3.13", "3.14"}  # wersje, które Vercel obsługuje


def test_the_cache_table_can_be_created_by_name_without_switching_production_mode_on(db):
    # tak stworzysz tabelę z własnego komputera, na bazie produkcyjnej: bez PRODUCTION=true, które wymagałoby wielu zmiennych
    call_command("createcachetable", "django_cache")
    with connection.cursor() as cursor:
        cursor.execute("select to_regclass('django_cache') is not null")
        assert cursor.fetchone()[0] is True


@pytest.mark.parametrize("value", ["", None])
def test_an_empty_or_missing_database_address_gives_a_clear_error_not_a_bare_keyerror(clean_copy, value):
    extra = {k: v for k, v in VERCEL_ENV.items() if k != "DATABASE_URL"}
    if value is not None:
        extra["DATABASE_URL"] = value  # pusta zmienna na Vercelu: dokładnie ten przypadek, który wywrócił budowanie
    result = run(["manage.py", "check"], env_for(extra), cwd=clean_copy)
    assert result.returncode != 0
    assert "DATABASE_URL" in result.stderr and "KeyError" not in result.stderr
