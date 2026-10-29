import pytest
from django.core.management import call_command
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import RANK, Role, User

pytestmark = pytest.mark.django_db

REGISTER, LOGIN, REFRESH, LOGOUT, ME = (f"/api/v1/auth/{p}/" for p in ("register", "login", "refresh", "logout", "me"))
PASSWORD = "Sup3r-secret-pw"


def register(api, username="anna", password=PASSWORD, **extra):
    return api.post(REGISTER, {"username": username, "password": password, **extra}, format="json")


def login(api, username="anna", password=PASSWORD):
    return api.post(LOGIN, {"username": username, "password": password}, format="json")


def test_register_creates_a_plain_user_without_leaking_the_password(api):
    response = register(api)
    assert response.status_code == 201
    assert set(response.json()) == {"id", "username"}
    user = User.objects.get(username="anna")
    assert user.role == Role.USER and not user.is_staff
    assert user.password != PASSWORD and user.check_password(PASSWORD)  # w bazie jest hash


def test_register_cannot_grant_a_role(api):
    register(api, role="owner", is_staff=True, is_superuser=True)
    user = User.objects.get(username="anna")
    assert user.role == Role.USER and not user.is_staff and not user.is_superuser


@pytest.mark.parametrize("second_name", ["anna", "ANNA", "Anna"])
def test_usernames_are_unique_ignoring_case(api, second_name):
    register(api)
    assert register(api, username=second_name).status_code == 400
    assert User.objects.count() == 1


@pytest.mark.parametrize("password", ["short1", "12345678", "password", "anna"])
def test_weak_passwords_are_rejected(api, password):
    assert register(api, password=password).status_code == 400
    assert not User.objects.exists()


def test_register_requires_username_and_password(api):
    assert api.post(REGISTER, {}, format="json").status_code == 400


def test_login_returns_tokens_and_wrong_credentials_are_401(api):
    register(api)
    assert set(login(api).json()) == {"access", "refresh"}
    assert login(api, password="wrong-password-1").status_code == 401
    assert login(api, username="nobody").status_code == 401


def test_access_token_lives_ten_minutes(api):
    register(api)
    token = AccessToken(login(api).json()["access"])
    assert token["exp"] - token["iat"] == 600


def test_me_needs_a_token_and_shows_role_but_not_email(api):
    register(api)
    assert api.get(ME).status_code == 401
    api.credentials(HTTP_AUTHORIZATION="Bearer " + login(api).json()["access"])
    body = api.get(ME).json()
    assert body["username"] == "anna" and body["role"] == "user" and "email" not in body


def test_garbage_token_is_401(api):
    api.credentials(HTTP_AUTHORIZATION="Bearer not-a-token")
    assert api.get(ME).status_code == 401


def test_refresh_rotates_and_the_old_refresh_token_stops_working(api):
    register(api)
    old = login(api).json()["refresh"]
    new = api.post(REFRESH, {"refresh": old}, format="json").json()["refresh"]
    assert new != old
    assert api.post(REFRESH, {"refresh": old}, format="json").status_code == 401
    assert api.post(REFRESH, {"refresh": new}, format="json").status_code == 200


def test_logout_blacklists_the_refresh_token(api):
    register(api)
    refresh = login(api).json()["refresh"]
    assert api.post(LOGOUT, {"refresh": refresh}, format="json").status_code == 200
    assert BlacklistedToken.objects.count() == 1
    assert api.post(REFRESH, {"refresh": refresh}, format="json").status_code == 401


def test_login_is_throttled_after_ten_attempts_per_minute(api):
    register(api)  # to jedna z 10 prób, bo rejestracja i logowanie dzielą limit
    # za każdym razem inna nazwa użytkownika, żeby sprawdzać limit na IP, a nie blokadę konta
    statuses = [login(api, username=f"nobody{i}", password="wrong-password-1").status_code for i in range(10)]
    assert statuses[:9] == [401] * 9 and statuses[9] == 429


def test_createsuperuser_makes_an_owner():
    user = User.objects.create_superuser("boss", password=PASSWORD)
    assert user.role == Role.OWNER and user.is_staff and user.is_superuser


@pytest.mark.parametrize("role, staff, superuser", [("user", False, False), ("admin", True, False), ("staff", True, False), ("owner", True, True)])
def test_django_flags_always_follow_the_role(role, staff, superuser):
    user = User.objects.create_user("x", password=PASSWORD)
    user.role = role
    user.save()
    user.refresh_from_db()
    assert (user.is_staff, user.is_superuser) == (staff, superuser)


def test_rank_order_is_user_admin_staff_owner():
    assert RANK["user"] < RANK["admin"] < RANK["staff"] < RANK["owner"]
