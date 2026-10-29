import pytest

API = "/api/v1/cocktails/"
ALLOWED = "http://localhost:3000"


def test_an_allowed_frontend_origin_may_read_the_api(api, data):
    response = api.get(API, HTTP_ORIGIN=ALLOWED)
    assert response["Access-Control-Allow-Origin"] == ALLOWED
    assert "Access-Control-Allow-Credentials" not in response  # logowanie idzie nagłówkiem, nie ciasteczkiem


@pytest.mark.parametrize("origin", ["https://evil.example", "http://localhost:3001", "null"])
def test_other_origins_get_no_cors_headers(api, data, origin):
    assert "Access-Control-Allow-Origin" not in api.get(API, HTTP_ORIGIN=origin)


def test_preflight_for_a_logged_in_write_is_allowed_from_the_frontend(api):
    response = api.options(
        API, HTTP_ORIGIN=ALLOWED, HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS="authorization,content-type",
    )
    assert response.status_code == 200
    assert response["Access-Control-Allow-Origin"] == ALLOWED
    assert "authorization" in response["Access-Control-Allow-Headers"].lower()
    assert "POST" in response["Access-Control-Allow-Methods"]


def test_a_preflight_from_a_foreign_origin_is_not_granted(api):
    response = api.options(API, HTTP_ORIGIN="https://evil.example", HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST")
    assert "Access-Control-Allow-Origin" not in response


def test_the_admin_panel_is_not_opened_to_other_sites(api):
    assert "Access-Control-Allow-Origin" not in api.get("/admin/login/", HTTP_ORIGIN=ALLOWED)


def test_the_allowed_origins_come_from_settings(api, data, settings):
    settings.CORS_ALLOWED_ORIGINS = ["https://my-frontend.example"]
    assert api.get(API, HTTP_ORIGIN="https://my-frontend.example")["Access-Control-Allow-Origin"] == "https://my-frontend.example"
    assert "Access-Control-Allow-Origin" not in api.get(API, HTTP_ORIGIN=ALLOWED)
