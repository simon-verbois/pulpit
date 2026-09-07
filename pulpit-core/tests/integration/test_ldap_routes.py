"""Route-level tests for the ldap module - staff-gated on every route,
unlike default_settings (open GET) since this touches how everyone
authenticates. Dependency-override style, same as test_default_settings_routes.py."""

from fastapi.testclient import TestClient

import app.main as main_module
from app.core.auth import FullUser, get_full_user
from app.core.database import get_db


def _client(db, *, is_staff: bool):
    def _override_db():
        yield db

    def _override_full_user():
        return FullUser(username="admin", pulp_href="/pulp/api/v3/users/1/", is_staff=is_staff)

    main_module.app.dependency_overrides[get_db] = _override_db
    main_module.app.dependency_overrides[get_full_user] = _override_full_user
    return TestClient(main_module.app)


def test_get_settings_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.get("/api/v1/ldap/settings")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_get_settings_returns_defaults_for_staff(db):
    client = _client(db, is_staff=True)
    try:
        response = client.get("/api/v1/ldap/settings")
        assert response.status_code == 200
        body = response.json()
        assert body["enabled"] is False
        assert body["bind_password_is_set"] is False
        assert "bind_password" not in body
    finally:
        main_module.app.dependency_overrides.clear()


def test_patch_settings_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.patch("/api/v1/ldap/settings", json={"enabled": True})
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_patch_settings_saves_and_encrypts_bind_password(db):
    client = _client(db, is_staff=True)
    try:
        response = client.patch(
            "/api/v1/ldap/settings",
            json={
                "enabled": True,
                "server_uri": "ldaps://ldap.example.com:636",
                "bind_dn": "cn=readonly,dc=example,dc=com",
                "bind_password": "s3cret",
                "user_search_base": "ou=people,dc=example,dc=com",
                "group_search_base": "ou=groups,dc=example,dc=com",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["enabled"] is True
        assert body["bind_password_is_set"] is True
        assert "bind_password" not in body
    finally:
        main_module.app.dependency_overrides.clear()


def test_apply_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.post("/api/v1/ldap/settings/apply")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_apply_enqueues_a_job_for_staff(db):
    client = _client(db, is_staff=True)
    try:
        response = client.post("/api/v1/ldap/settings/apply")
        assert response.status_code == 202
        body = response.json()
        assert body["job_type"] == "ldap.apply_config"
        assert body["status"] == "queued"
        assert body["requested_by"] == "admin"
    finally:
        main_module.app.dependency_overrides.clear()


def test_test_connection_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.post("/api/v1/ldap/settings/test-connection", json={})
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_test_connection_enqueues_a_job_for_staff(db):
    client = _client(db, is_staff=True)
    try:
        response = client.post(
            "/api/v1/ldap/settings/test-connection",
            json={"server_uri": "ldap://ldap.example.com:389"},
        )
        assert response.status_code == 202
        body = response.json()
        assert body["job_type"] == "ldap.test_connection"
        assert body["status"] == "queued"
    finally:
        main_module.app.dependency_overrides.clear()
