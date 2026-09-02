"""CSRF enforcement on pulpit-core's own auth dependency (app/core/auth.py) -
exercised against the REAL require_authenticated_user (not the stubbed
override tests/integration/test_api.py uses), with only the outbound Pulp
call mocked via respx."""

import httpx
import respx
from fastapi.testclient import TestClient

import app.main as main_module
from app.core.database import get_db


def _client_with_fake_pulp_login(db):
    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    return TestClient(main_module.app)


def test_patch_without_csrf_header_is_rejected(db):
    client = _client_with_fake_pulp_login(db)
    try:
        with respx.mock:
            respx.get("http://pulp:80/pulp/api/v3/login/").mock(
                return_value=httpx.Response(200, json={"pulp_href": "/x/", "username": "admin"})
            )
            response = client.patch(
                "/api/v1/signing/settings",
                json={"identity_name": "New Name"},
                cookies={"sessionid": "fake", "csrftoken": "abc123"},
            )
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_patch_with_matching_csrf_header_is_accepted(db):
    client = _client_with_fake_pulp_login(db)
    try:
        with respx.mock:
            respx.get("http://pulp:80/pulp/api/v3/login/").mock(
                return_value=httpx.Response(200, json={"pulp_href": "/x/", "username": "admin"})
            )
            response = client.patch(
                "/api/v1/signing/settings",
                json={"identity_name": "New Name"},
                cookies={"sessionid": "fake", "csrftoken": "abc123"},
                headers={"X-CSRFToken": "abc123"},
            )
        assert response.status_code == 200
    finally:
        main_module.app.dependency_overrides.clear()


def test_patch_with_mismatched_csrf_header_is_rejected(db):
    client = _client_with_fake_pulp_login(db)
    try:
        with respx.mock:
            respx.get("http://pulp:80/pulp/api/v3/login/").mock(
                return_value=httpx.Response(200, json={"pulp_href": "/x/", "username": "admin"})
            )
            response = client.patch(
                "/api/v1/signing/settings",
                json={"identity_name": "New Name"},
                cookies={"sessionid": "fake", "csrftoken": "abc123"},
                headers={"X-CSRFToken": "wrong-token"},
            )
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_get_never_requires_csrf(db):
    client = _client_with_fake_pulp_login(db)
    try:
        with respx.mock:
            respx.get("http://pulp:80/pulp/api/v3/login/").mock(
                return_value=httpx.Response(200, json={"pulp_href": "/x/", "username": "admin"})
            )
            response = client.get("/api/v1/signing/settings", cookies={"sessionid": "fake"})
        assert response.status_code == 200
    finally:
        main_module.app.dependency_overrides.clear()


def test_basic_auth_without_cookie_skips_csrf_check(db):
    """Matches Pulp's own documented behavior (docs/AUTHENTICATION.md):
    Basic-auth-only requests aren't CSRF-checked since there's no session
    cookie in play for a cross-site request to ride."""
    client = _client_with_fake_pulp_login(db)
    try:
        with respx.mock:
            respx.get("http://pulp:80/pulp/api/v3/login/").mock(
                return_value=httpx.Response(200, json={"pulp_href": "/x/", "username": "admin"})
            )
            response = client.patch(
                "/api/v1/signing/settings",
                json={"identity_name": "New Name"},
                headers={"Authorization": "Basic YWRtaW46cGFzcw=="},
            )
        assert response.status_code == 200
    finally:
        main_module.app.dependency_overrides.clear()
