"""Route-level tests for signing/routes/repositories.py's staff-gated bulk
action (apply-to-all) - dependency-override style, same as
test_default_settings_routes.py."""

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


def test_apply_to_all_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.post("/api/v1/signing/repositories/apply-to-all")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_apply_to_all_enqueues_a_job_for_staff(db):
    client = _client(db, is_staff=True)
    try:
        response = client.post("/api/v1/signing/repositories/apply-to-all")
        assert response.status_code == 202
        body = response.json()
        assert body["job_type"] == "signing.apply_signing_to_all_repositories"
        assert body["status"] == "queued"
        assert body["requested_by"] == "admin"
    finally:
        main_module.app.dependency_overrides.clear()
