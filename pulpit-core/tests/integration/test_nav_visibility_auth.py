"""Exercises the REAL get_full_user/require_staff_user dependency chain
(not the stubbed override test_nav_visibility.py uses), with only the
outbound Pulp calls mocked via respx - same approach as test_csrf.py."""

import httpx
import respx
from fastapi.testclient import TestClient

import app.main as main_module
from app.core.database import get_db

_LOGIN_URL = "http://pulp:80/pulp/api/v3/login/"
_USER_URL = "http://pulp:80/pulp/api/v3/users/1/"


def _client(db):
    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    return TestClient(main_module.app)


def test_me_resolves_using_the_real_self_lookup(db):
    """`/me` only depends on `require_authenticated_user` now (no staff
    special-casing left - see service.py's own docstring), so this needs no
    `_USER_URL` mock at all, unlike the settings tests below."""
    client = _client(db)
    client.cookies.set("sessionid", "fake")
    try:
        with respx.mock:
            respx.get(_LOGIN_URL).mock(
                return_value=httpx.Response(
                    200, json={"pulp_href": "/pulp/api/v3/users/1/", "username": "bob"}
                )
            )
            response = client.get("/api/v1/nav_visibility/me")
        assert response.status_code == 200
        assert response.json() == {"visible_module_ids": None}
    finally:
        main_module.app.dependency_overrides.clear()


def test_settings_rejects_a_non_staff_user(db):
    client = _client(db)
    client.cookies.set("sessionid", "fake")
    try:
        with respx.mock:
            respx.get(_LOGIN_URL).mock(
                return_value=httpx.Response(
                    200, json={"pulp_href": "/pulp/api/v3/users/1/", "username": "bob"}
                )
            )
            respx.get(_USER_URL).mock(
                return_value=httpx.Response(
                    200, json={"username": "bob", "is_staff": False}
                )
            )
            response = client.get("/api/v1/nav_visibility/settings")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_settings_accepts_a_staff_user(db):
    client = _client(db)
    client.cookies.set("sessionid", "fake")
    try:
        with respx.mock:
            respx.get(_LOGIN_URL).mock(
                return_value=httpx.Response(
                    200, json={"pulp_href": "/pulp/api/v3/users/1/", "username": "admin"}
                )
            )
            respx.get(_USER_URL).mock(
                return_value=httpx.Response(
                    200, json={"username": "admin", "is_staff": True}
                )
            )
            response = client.get("/api/v1/nav_visibility/settings")
        assert response.status_code == 200
    finally:
        main_module.app.dependency_overrides.clear()


def test_me_requires_authentication(db):
    client = _client(db)
    try:
        response = client.get("/api/v1/nav_visibility/me")
        assert response.status_code == 401
    finally:
        main_module.app.dependency_overrides.clear()
