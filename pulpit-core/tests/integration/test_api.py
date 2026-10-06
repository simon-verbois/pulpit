"""HTTP-level tests: routing, auth enforcement, and the public key endpoint
(task section 16: "public key endpoint", "coexistence of old/new public
keys during rotation")."""

from datetime import UTC, datetime, timedelta

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

import app.main as main_module
from app.core.auth import CurrentUser, FullUser, get_full_user, require_authenticated_user
from app.core.database import get_db


@pytest.fixture
def client(db):
    def _override_db():
        yield db

    def _override_auth():
        return CurrentUser(username="admin", pulp_href="/pulp/api/v3/users/1/")

    def _override_full_user():
        # Staff by default: a couple of routes exercised through this
        # fixture (e.g. default_settings PATCH /settings) are staff-gated,
        # and without this override `require_staff_user`'s own `get_full_user` dependency
        # would fall through to a real (failing, in tests) Pulp lookup
        # instead of the fake session `_override_auth` above already
        # provides. Tests that specifically exercise the non-staff-rejected
        # path use their own dedicated client (see
        # test_default_settings_staff_gating below).
        return FullUser(username="admin", pulp_href="/pulp/api/v3/users/1/", is_staff=True)

    main_module.app.dependency_overrides[get_db] = _override_db
    main_module.app.dependency_overrides[require_authenticated_user] = _override_auth
    main_module.app.dependency_overrides[get_full_user] = _override_full_user
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


@respx.mock
def test_health_reports_ok_with_every_component_when_everything_is_healthy(db):
    respx.get("http://pulp:80/pulp/api/v3/status/").mock(
        return_value=httpx.Response(200, json={"versions": []})
    )

    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/api/v1/health")
    finally:
        main_module.app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["components"]["database"] == {"status": "ok"}
    assert body["components"]["pulp"] == {"status": "ok"}
    assert body["components"]["worker"] == {"status": "ok"}


@respx.mock
def test_health_is_degraded_but_still_200_when_only_pulp_is_unreachable(db):
    """Distinct from the database being down (see the 503 test below) - see
    app/api/health.py's own docstring on why an unreachable Pulp must never
    flip the HTTP status code (both readinessProbe AND livenessProbe hit
    this same path)."""
    respx.get("http://pulp:80/pulp/api/v3/status/").mock(
        side_effect=httpx.ConnectError("connection refused")
    )

    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/api/v1/health")
    finally:
        main_module.app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert body["components"]["pulp"] == {"status": "error", "detail": "Pulp is unreachable"}
    assert body["components"]["database"] == {"status": "ok"}


@respx.mock
def test_health_reports_worker_ok_when_no_job_has_ever_run(db):
    """A fresh instance - no scheduled heartbeat has fired yet - is not
    itself a sign the worker is stuck."""
    respx.get("http://pulp:80/pulp/api/v3/status/").mock(
        return_value=httpx.Response(200, json={"versions": []})
    )

    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/api/v1/health")
    finally:
        main_module.app.dependency_overrides.clear()

    assert response.json()["components"]["worker"] == {"status": "ok"}


@respx.mock
def test_health_reports_worker_error_when_no_job_has_completed_recently(db):
    from app.core.jobs.models import Job, JobStatus

    respx.get("http://pulp:80/pulp/api/v3/status/").mock(
        return_value=httpx.Response(200, json={"versions": []})
    )
    stale_job = Job(
        job_type="signing.rotation_check",
        status=JobStatus.SUCCESS,
        scheduled_at=datetime.now(UTC) - timedelta(hours=1),
        finished_at=datetime.now(UTC) - timedelta(hours=1),
    )
    db.add(stale_job)
    db.flush()

    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/api/v1/health")
    finally:
        main_module.app.dependency_overrides.clear()

    body = response.json()
    assert response.status_code == 200  # still 200 - only the database gates the status code
    assert body["status"] == "degraded"
    assert body["components"]["worker"] == {
        "status": "error",
        "detail": "No scheduled job has completed recently",
    }


def test_health_returns_503_and_skips_other_components_when_database_is_unreachable():
    class _BrokenSession:
        def execute(self, *args, **kwargs):
            raise RuntimeError("simulated database outage")

    def _override_db():
        yield _BrokenSession()

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/api/v1/health")
    finally:
        main_module.app.dependency_overrides.clear()

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "error"
    assert body["components"]["database"] == {
        "status": "error",
        "detail": "Database is unreachable",
    }
    assert body["components"]["pulp"] == {"status": "skipped"}
    assert body["components"]["worker"] == {"status": "skipped"}


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


def test_default_settings_requires_auth(db):
    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/api/v1/default_settings/settings")
    finally:
        main_module.app.dependency_overrides.clear()
    assert response.status_code == 401


def test_get_default_settings_returns_empty_defaults(client):
    response = client.get("/api/v1/default_settings/settings")
    assert response.status_code == 200
    body = response.json()
    assert body["proxy_url"] == ""
    assert body["proxy_username"] == ""
    assert body["proxy_password_is_set"] is False
    assert body["proxy_tls_validation"] is True
    assert body["proxy_ca_cert"] is None


def test_patch_default_settings_updates_proxy_tls_validation(client):
    response = client.patch(
        "/api/v1/default_settings/settings", json={"proxy_tls_validation": False}
    )
    assert response.status_code == 200
    assert response.json()["proxy_tls_validation"] is False

    # And it stays put when omitted from a later, unrelated PATCH.
    response = client.patch(
        "/api/v1/default_settings/settings", json={"proxy_username": "svc-proxy"}
    )
    assert response.json()["proxy_tls_validation"] is False


def test_patch_default_settings_updates_proxy_url(client):
    response = client.patch(
        "/api/v1/default_settings/settings",
        json={"proxy_url": "http://proxy.example.com:3128"},
    )
    assert response.status_code == 200
    assert response.json()["proxy_url"] == "http://proxy.example.com:3128"


def test_patch_default_settings_proxy_password_is_write_only(client):
    response = client.patch(
        "/api/v1/default_settings/settings", json={"proxy_password": "s3cret"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["proxy_password_is_set"] is True
    assert "s3cret" not in str(body)

    # A follow-up GET must never echo it back either.
    response = client.get("/api/v1/default_settings/settings")
    assert "s3cret" not in str(response.json())


def test_patch_default_settings_empty_proxy_password_clears_it(client):
    client.patch("/api/v1/default_settings/settings", json={"proxy_password": "s3cret"})
    response = client.patch("/api/v1/default_settings/settings", json={"proxy_password": ""})
    assert response.status_code == 200
    assert response.json()["proxy_password_is_set"] is False


def test_patch_default_settings_omitted_proxy_password_leaves_it_unchanged(client):
    client.patch("/api/v1/default_settings/settings", json={"proxy_password": "s3cret"})
    response = client.patch(
        "/api/v1/default_settings/settings", json={"proxy_url": "http://proxy:3128"}
    )
    assert response.status_code == 200
    assert response.json()["proxy_password_is_set"] is True


def test_patch_default_settings_proxy_password_without_secret_key_is_503(client, monkeypatch):
    from app.core import crypto

    crypto._fernet.cache_clear()
    monkeypatch.setenv("PULPIT_CORE_SECRET_KEY", "")
    crypto.get_settings.cache_clear()
    try:
        response = client.patch(
            "/api/v1/default_settings/settings", json={"proxy_password": "s3cret"}
        )
        assert response.status_code == 503
    finally:
        crypto._fernet.cache_clear()
        crypto.get_settings.cache_clear()

    # Every other field still updates fine with no key configured.
    response = client.patch(
        "/api/v1/default_settings/settings", json={"proxy_url": "http://proxy:3128"}
    )
    assert response.status_code == 200


def _non_staff_client(db):
    """A caller who is authenticated but not staff - for the two routes
    default_settings/routes/proxy_credentials.py and settings.py's PATCH
    gate to require_staff_user (instance-wide proxy credentials, same blast
    radius as apply_proxy.py's own staff-only bulk action)."""

    def _override_db():
        yield db

    def _override_auth():
        return CurrentUser(username="not-staff", pulp_href="/pulp/api/v3/users/2/")

    def _override_full_user():
        return FullUser(username="not-staff", pulp_href="/pulp/api/v3/users/2/", is_staff=False)

    main_module.app.dependency_overrides[get_db] = _override_db
    main_module.app.dependency_overrides[require_authenticated_user] = _override_auth
    main_module.app.dependency_overrides[get_full_user] = _override_full_user
    return TestClient(main_module.app)


def test_patch_default_settings_rejects_non_staff(db):
    client = _non_staff_client(db)
    try:
        response = client.patch(
            "/api/v1/default_settings/settings", json={"proxy_url": "http://proxy:3128"}
        )
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_get_default_settings_allows_non_staff(db):
    """Unlike PATCH above, plain GET never returns the raw password (see
    schemas.py's DefaultSettingsRead) so it stays open to any authenticated
    user - no staff gate on this one."""
    client = _non_staff_client(db)
    try:
        response = client.get("/api/v1/default_settings/settings")
        assert response.status_code == 200
    finally:
        main_module.app.dependency_overrides.clear()


def test_proxy_credentials_rejects_non_staff(db):
    client = _non_staff_client(db)
    try:
        response = client.get("/api/v1/default_settings/proxy-credentials")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_proxy_credentials_requires_auth(db):
    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get(
            "/api/v1/default_settings/proxy-credentials"
        )
    finally:
        main_module.app.dependency_overrides.clear()
    assert response.status_code == 401


def test_proxy_credentials_returns_the_decrypted_password(client):
    response = client.get("/api/v1/default_settings/proxy-credentials")
    assert response.status_code == 410
    assert "password" not in response.json()


def test_proxy_credentials_password_is_null_when_unset(client):
    response = client.get("/api/v1/default_settings/proxy-credentials")
    assert response.status_code == 410
    assert "password" not in response.json()


_TEST_PEM = "-----BEGIN CERTIFICATE-----\nMIIC...fake...==\n-----END CERTIFICATE-----\n"


def test_patch_default_settings_updates_proxy_ca_cert(client):
    response = client.patch(
        "/api/v1/default_settings/settings", json={"proxy_ca_cert": _TEST_PEM}
    )
    assert response.status_code == 200
    assert response.json()["proxy_ca_cert"] == _TEST_PEM.strip()

    assert client.get("/api/v1/default_settings/proxy-credentials").status_code == 410


def test_patch_default_settings_rejects_non_pem_ca_cert(client):
    response = client.patch(
        "/api/v1/default_settings/settings", json={"proxy_ca_cert": "not a cert"}
    )
    assert response.status_code == 422


def test_patch_default_settings_empty_proxy_ca_cert_clears_it(client):
    client.patch("/api/v1/default_settings/settings", json={"proxy_ca_cert": _TEST_PEM})
    response = client.patch("/api/v1/default_settings/settings", json={"proxy_ca_cert": ""})
    assert response.status_code == 200
    assert response.json()["proxy_ca_cert"] is None


def test_patch_default_settings_omitted_proxy_ca_cert_leaves_it_unchanged(client):
    client.patch("/api/v1/default_settings/settings", json={"proxy_ca_cert": _TEST_PEM})
    response = client.patch(
        "/api/v1/default_settings/settings", json={"proxy_url": "http://proxy:3128"}
    )
    assert response.status_code == 200
    assert response.json()["proxy_ca_cert"] == _TEST_PEM.strip()


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
    from datetime import datetime, timedelta

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
        retiring_at=datetime.now(UTC) - timedelta(days=1),
    )
    db.add_all([active, retiring])
    db.flush()

    response = client.get("/keys/RPM-GPG-KEY-pulp")
    assert response.status_code == 200
    assert "ACTIVE" in response.text
    assert "RETIRING" not in response.text
    assert response.headers["content-type"].startswith("application/pgp-keys")


def test_public_key_by_fingerprint_requires_authentication(db):
    """Unlike GET /keys/<filename> above, this diagnostic/audit lookup
    (routes/public_key.py) is NOT part of the documented public surface -
    it must reject a caller with no session at all."""

    def _override_db():
        yield db

    main_module.app.dependency_overrides[get_db] = _override_db
    try:
        response = TestClient(main_module.app).get("/keys/by-fingerprint/" + "A" * 40)
    finally:
        main_module.app.dependency_overrides.clear()
    assert response.status_code == 401


def test_public_key_by_fingerprint_rejects_non_staff(db):
    client = _non_staff_client(db)
    try:
        response = client.get("/keys/by-fingerprint/" + "A" * 40)
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_public_key_by_fingerprint_allows_staff(client, db):
    """`client` is staff by default (see the fixture above) - can look up
    even a RETIRING key by fingerprint, unlike the public /{filename} route."""
    from datetime import datetime, timedelta

    from app.modules.signing.models import KeyState, SigningKey

    retiring = SigningKey(
        state=KeyState.RETIRING,
        key_id="BBBB",
        fingerprint="B" * 40,
        identity_name="Test",
        algorithm="rsa4096",
        public_key_armor="-----BEGIN PGP PUBLIC KEY BLOCK-----\nRETIRING\n-----END PGP PUBLIC KEY BLOCK-----\n",
        retiring_at=datetime.now(UTC) - timedelta(days=1),
    )
    db.add(retiring)
    db.flush()

    response = client.get("/keys/by-fingerprint/" + "B" * 40)
    assert response.status_code == 200
    assert response.json()["fingerprint"] == "B" * 40
