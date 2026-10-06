"""Route-level tests for the default_settings module's staff-gated bulk
action (apply-proxy-to-all-remotes) - dependency-override style, same as
test_nav_visibility.py."""

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


def test_apply_proxy_to_all_remotes_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.post("/api/v1/default_settings/apply-proxy-to-all-remotes")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_legacy_bulk_action_directs_staff_to_global_settings(db):
    client = _client(db, is_staff=True)
    try:
        response = client.post("/api/v1/default_settings/apply-proxy-to-all-remotes")
        assert response.status_code == 410
        assert "automatically" in response.json()["detail"]
    finally:
        main_module.app.dependency_overrides.clear()
