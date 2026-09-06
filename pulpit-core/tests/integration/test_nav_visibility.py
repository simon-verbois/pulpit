"""Functional tests for the nav-visibility module (allow-list model,
default-visible, no staff bypass - see service.py's own docstring), using
dependency overrides (same style as test_api.py's `client` fixture) for the
two-hop auth chain (require_authenticated_user -> get_full_user) - the real
self-lookup/CSRF/staff-gate behavior is exercised separately in
test_nav_visibility_auth.py via respx, mirroring test_csrf.py's split from
test_api.py."""

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.core.auth import CurrentUser, FullUser, get_full_user, require_authenticated_user
from app.core.database import get_db


def _client(db, *, is_staff: bool = True, username: str = "admin"):
    def _override_db():
        yield db

    def _override_current_user():
        return CurrentUser(username=username, pulp_href="/pulp/api/v3/users/1/")

    def _override_full_user():
        return FullUser(
            username=username,
            pulp_href="/pulp/api/v3/users/1/",
            is_staff=is_staff,
        )

    main_module.app.dependency_overrides[get_db] = _override_db
    main_module.app.dependency_overrides[require_authenticated_user] = _override_current_user
    main_module.app.dependency_overrides[get_full_user] = _override_full_user
    return TestClient(main_module.app)


@pytest.fixture
def staff_client(db):
    try:
        yield _client(db, is_staff=True)
    finally:
        main_module.app.dependency_overrides.clear()


def test_get_settings_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.get("/api/v1/nav_visibility/settings")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_put_settings_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.put(
            "/api/v1/nav_visibility/settings", json={"visible_module_ids": ["rpm"]}
        )
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_get_settings_defaults_to_empty(staff_client):
    response = staff_client.get("/api/v1/nav_visibility/settings")
    assert response.status_code == 200
    assert response.json() == {"visible_module_ids": []}


def test_put_settings_grants_modules(staff_client):
    response = staff_client.put(
        "/api/v1/nav_visibility/settings", json={"visible_module_ids": ["rpm", "administration"]}
    )
    assert response.status_code == 200
    assert sorted(response.json()["visible_module_ids"]) == ["administration", "rpm"]

    # And it's persisted - a follow-up GET returns the same set.
    response = staff_client.get("/api/v1/nav_visibility/settings")
    assert sorted(response.json()["visible_module_ids"]) == ["administration", "rpm"]


def test_put_settings_replaces_the_whole_set(staff_client):
    staff_client.put("/api/v1/nav_visibility/settings", json={"visible_module_ids": ["rpm", "maven"]})
    response = staff_client.put(
        "/api/v1/nav_visibility/settings", json={"visible_module_ids": ["deb"]}
    )
    assert response.json()["visible_module_ids"] == ["deb"]


def test_put_settings_deduplicates(staff_client):
    response = staff_client.put(
        "/api/v1/nav_visibility/settings", json={"visible_module_ids": ["rpm", "rpm", "rpm"]}
    )
    assert response.status_code == 200
    assert response.json()["visible_module_ids"] == ["rpm"]


def test_resolved_visibility_with_no_settings_sees_everything(db):
    """Default-visible: nothing configured at all means unrestricted."""
    client = _client(db, is_staff=False, username="bob")
    try:
        response = client.get("/api/v1/nav_visibility/me")
        assert response.status_code == 200
        assert response.json() == {"visible_module_ids": None}
    finally:
        main_module.app.dependency_overrides.clear()


def test_resolved_visibility_with_every_module_unchecked_sees_everything(staff_client, db):
    """Explicitly clearing the whole grant set (every box unchecked) is the
    same as never having configured it - still unrestricted, not "show
    nothing"."""
    staff_client.put(
        "/api/v1/nav_visibility/settings", json={"visible_module_ids": ["rpm"]}
    )
    staff_client.put("/api/v1/nav_visibility/settings", json={"visible_module_ids": []})
    main_module.app.dependency_overrides.clear()

    client = _client(db, is_staff=False, username="bob")
    try:
        response = client.get("/api/v1/nav_visibility/me")
        assert response.json() == {"visible_module_ids": None}
    finally:
        main_module.app.dependency_overrides.clear()


def test_staff_user_is_unrestricted_by_default(db):
    """Unrestricted here because nothing has been configured yet - not
    because the caller is staff (no staff special-casing left at all, see
    the next test)."""
    client = _client(db, username="admin", is_staff=True)
    try:
        response = client.get("/api/v1/nav_visibility/me")
        assert response.json() == {"visible_module_ids": None}
    finally:
        main_module.app.dependency_overrides.clear()


def test_staff_user_is_restricted_by_an_explicit_grant_too(staff_client, db):
    """The whole point of removing the old staff bypass: a staff account
    that unchecks a box in its own General tab must see that box's effect
    on its own sidebar too, not just on everyone else's."""
    staff_client.put("/api/v1/nav_visibility/settings", json={"visible_module_ids": ["rpm"]})
    main_module.app.dependency_overrides.clear()

    client = _client(db, is_staff=True, username="admin")
    try:
        response = client.get("/api/v1/nav_visibility/me")
        assert response.json() == {"visible_module_ids": ["rpm"]}
    finally:
        main_module.app.dependency_overrides.clear()


def test_resolved_visibility_applies_global_grant(staff_client, db):
    staff_client.put("/api/v1/nav_visibility/settings", json={"visible_module_ids": ["rpm"]})
    main_module.app.dependency_overrides.clear()

    client = _client(db, is_staff=False, username="bob")
    try:
        response = client.get("/api/v1/nav_visibility/me")
        assert response.json() == {"visible_module_ids": ["rpm"]}
    finally:
        main_module.app.dependency_overrides.clear()


def test_resolved_visibility_is_the_same_for_every_user_staff_or_not(staff_client, db):
    """One global set, no per-user/per-role distinction any more - a
    regular user and a staff user see the exact same set."""
    staff_client.put(
        "/api/v1/nav_visibility/settings", json={"visible_module_ids": ["rpm", "deb"]}
    )
    main_module.app.dependency_overrides.clear()

    alice = _client(db, is_staff=False, username="alice")
    try:
        response = alice.get("/api/v1/nav_visibility/me")
        assert sorted(response.json()["visible_module_ids"]) == ["deb", "rpm"]
    finally:
        main_module.app.dependency_overrides.clear()

    admin = _client(db, is_staff=True, username="admin")
    try:
        response = admin.get("/api/v1/nav_visibility/me")
        assert sorted(response.json()["visible_module_ids"]) == ["deb", "rpm"]
    finally:
        main_module.app.dependency_overrides.clear()
