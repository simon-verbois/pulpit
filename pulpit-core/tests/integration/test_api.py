"""HTTP-level tests: routing, auth enforcement, and the public key endpoint
(task section 16: "public key endpoint", "coexistence of old/new public
keys during rotation")."""

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.core.auth import CurrentUser, require_authenticated_user
from app.core.database import get_db


@pytest.fixture
def client(db):
    def _override_db():
        yield db

    def _override_auth():
        return CurrentUser(username="admin", pulp_href="/pulp/api/v3/users/1/")

    main_module.app.dependency_overrides[get_db] = _override_db
    main_module.app.dependency_overrides[require_authenticated_user] = _override_auth
    try:
        yield TestClient(main_module.app)
    finally:
        main_module.app.dependency_overrides.clear()


def test_health_is_unauthenticated(db):
    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/api/v1/health")
    finally:
        main_module.app.dependency_overrides.clear()
    assert response.status_code == 200


def test_signing_settings_requires_auth(db):
    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/api/v1/signing/settings")
    finally:
        main_module.app.dependency_overrides.clear()
    assert response.status_code == 401


def test_get_settings_returns_defaults(client):
    response = client.get("/api/v1/signing/settings")
    assert response.status_code == 200
    body = response.json()
    assert body["key_name"] == "Pulp Repository Signing Key"
    assert body["signing_enabled"] is False
    assert "private" not in str(body).lower()


def test_patch_settings_updates_identity(client):
    response = client.patch(
        "/api/v1/signing/settings",
        json={"identity_name": "Acme Corp Signing Key", "identity_email": "signing@example.org"},
    )
    assert response.status_code == 200
    assert response.json()["identity_name"] == "Acme Corp Signing Key"


def test_patch_settings_rejects_bad_algorithm(client):
    response = client.patch("/api/v1/signing/settings", json={"algorithm": "not-an-algorithm"})
    assert response.status_code == 422


def test_patch_settings_rejects_path_traversal_in_filename(client):
    response = client.patch(
        "/api/v1/signing/settings", json={"public_key_filename": "../../etc/passwd"}
    )
    assert response.status_code == 422


def test_generate_key_returns_queued_job(client):
    response = client.post("/api/v1/signing/keys/generate", json={})
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    assert body["job_type"] == "signing.generate_key"


def test_list_keys_empty_initially(client):
    response = client.get("/api/v1/signing/keys")
    assert response.status_code == 200
    assert response.json() == []


def test_public_key_endpoint_404_before_any_key(client):
    response = client.get("/keys/RPM-GPG-KEY-pulp")
    assert response.status_code == 404


def test_public_key_endpoint_unknown_filename_404(client):
    response = client.get("/keys/some-other-name")
    assert response.status_code == 404


def test_public_key_endpoint_is_reachable_without_authentication(db):
    """Distinct from every /api/v1/signing/... route - see module.py's
    public_router (task section 7: DNF clients never authenticate)."""

    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/keys/RPM-GPG-KEY-pulp")
    finally:
        main_module.app.dependency_overrides.clear()
    # No 401 - only 404 (no key generated yet), proving no auth dependency
    # is attached to this route at all.
    assert response.status_code == 404


def test_public_key_endpoint_serves_only_the_active_key(client, db):
    """Single active key model (task requirement: "je veux une seule cle
    active ... on expose toujours la meme") - a RETIRING key's public key is
    NOT included, unlike the earlier coexistence design."""
    from datetime import datetime, timedelta, timezone

    from app.modules.signing.models import KeyState, SigningKey

    active = SigningKey(
        state=KeyState.ACTIVE,
        key_id="AAAA",
        fingerprint="A" * 40,
        identity_name="Test",
        algorithm="rsa4096",
        public_key_armor="-----BEGIN PGP PUBLIC KEY BLOCK-----\nACTIVE\n-----END PGP PUBLIC KEY BLOCK-----\n",
    )
    retiring = SigningKey(
        state=KeyState.RETIRING,
        key_id="BBBB",
        fingerprint="B" * 40,
        identity_name="Test",
        algorithm="rsa4096",
        public_key_armor="-----BEGIN PGP PUBLIC KEY BLOCK-----\nRETIRING\n-----END PGP PUBLIC KEY BLOCK-----\n",
        retiring_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.add_all([active, retiring])
    db.flush()

    response = client.get("/keys/RPM-GPG-KEY-pulp")
    assert response.status_code == 200
    assert "ACTIVE" in response.text
    assert "RETIRING" not in response.text
    assert response.headers["content-type"].startswith("application/pgp-keys")
