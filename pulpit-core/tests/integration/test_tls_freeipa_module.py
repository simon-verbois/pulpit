"""Integration tests for the FreeIPA provider: settings CRUD route, the
request/renew/test-connection jobs (FreeIPAClient faked - see
app/adapters/freeipa/client.py's own docstring on why its exact RPC shapes
aren't verified live), the renewal heartbeat's FreeIPA branch, and the
wizard route (orchestration faked - tests/unit/test_freeipa_wizard.py
already covers that logic in isolation)."""

import base64
from datetime import UTC, datetime, timedelta

from cryptography.hazmat.primitives import serialization
from fastapi.testclient import TestClient

import app.main as main_module
from app.adapters.freeipa.exceptions import FreeIPAAdapterError
from app.core.auth import FullUser, get_full_user
from app.core.database import get_db
from app.modules.tls import freeipa_settings, service
from app.modules.tls import jobs as tls_jobs
from app.modules.tls.models import TlsCertificate, TlsCertSource
from app.modules.tls.selfsigned import generate_selfsigned


def _der_b64(cert_pem: str) -> str:
    from cryptography import x509

    certificate = x509.load_pem_x509_certificate(cert_pem.encode())
    return base64.b64encode(certificate.public_bytes(serialization.Encoding.DER)).decode()


def _configure_freeipa_settings(db) -> None:
    row = freeipa_settings.get_settings_row(db)
    freeipa_settings.update_settings(
        db,
        row,
        {
            "enabled": True,
            "base_url": "https://ipa.example.test",
            "verify_tls": True,
            "common_name": "pulpit.example.com",
            "service_principal": "HTTP/pulpit.example.com@EXAMPLE.COM",
            "service_username": "svc-pulpit-tls",
            "service_password": "s3cret",
            "ca": "ipa",
            "auto_renew_enabled": True,
            "renew_before_days": 30,
        },
    )
    db.flush()


class FakeFreeIPAClient:
    def __init__(self, base_url, *, verify_tls=True, timeout=30.0):
        self.base_url = base_url

    def login(self, username, password):
        if password != "s3cret":
            raise FreeIPAAdapterError("bad credentials")
        return "session-cookie"

    def request_cert(self, session_cookie, *, csr_pem, principal, ca, profile):
        generated = generate_selfsigned(common_name="pulpit.example.com", validity_days=365)
        return {"certificate": _der_b64(generated.cert_pem), "request_id": 7}


def test_generate_settings_row_defaults_to_disabled(db):
    row = freeipa_settings.get_settings_row(db)
    assert row.enabled is False
    assert row.service_password_is_set is False


def test_update_settings_encrypts_the_password_and_never_stores_it_raw(db):
    row = freeipa_settings.get_settings_row(db)
    freeipa_settings.update_settings(db, row, {"service_password": "s3cret"})

    assert row.service_password_is_set is True
    assert row.service_password_encrypted != "s3cret"


def test_freeipa_test_connection_job_reports_success(db, monkeypatch):
    monkeypatch.setattr(tls_jobs, "FreeIPAClient", FakeFreeIPAClient)
    _configure_freeipa_settings(db)

    result = tls_jobs.freeipa_test_connection_job(db, {})

    assert result == {"success": True}


def test_freeipa_test_connection_job_reports_failure(db, monkeypatch):
    monkeypatch.setattr(tls_jobs, "FreeIPAClient", FakeFreeIPAClient)
    row = freeipa_settings.get_settings_row(db)
    freeipa_settings.update_settings(
        db,
        row,
        {
            "base_url": "https://ipa.example.test",
            "service_username": "svc-pulpit-tls",
            "service_password": "wrong-password",
        },
    )

    result = tls_jobs.freeipa_test_connection_job(db, {})

    assert result["success"] is False
    assert "bad credentials" in result["error"]


def test_freeipa_request_cert_job_installs_the_issued_certificate(db, monkeypatch):
    monkeypatch.setattr(tls_jobs, "FreeIPAClient", FakeFreeIPAClient)
    _configure_freeipa_settings(db)

    result = tls_jobs.freeipa_request_cert_job(db, {"triggered_by": "manual"})

    active = service.get_active_certificate(db)
    assert active is not None
    assert active.source == TlsCertSource.FREEIPA
    assert active.freeipa_principal == "HTTP/pulpit.example.com@EXAMPLE.COM"
    assert active.fingerprint_sha256 == result["fingerprint"]


def test_freeipa_request_cert_job_requires_enabled_settings(db):
    with_error = None
    try:
        tls_jobs.freeipa_request_cert_job(db, {})
    except ValueError as exc:
        with_error = str(exc)
    assert with_error == "The FreeIPA provider is not enabled."


def test_renewal_check_renews_a_freeipa_cert_nearing_expiry(db, monkeypatch):
    monkeypatch.setattr(tls_jobs, "FreeIPAClient", FakeFreeIPAClient)
    _configure_freeipa_settings(db)
    now = datetime.now(UTC)
    old_fingerprint = "e" * 64
    db.add(
        TlsCertificate(
            source=TlsCertSource.FREEIPA,
            subject="pulpit.example.com",
            fingerprint_sha256=old_fingerprint,
            not_before=now - timedelta(days=300),
            not_after=now + timedelta(days=10),
            freeipa_principal="HTTP/pulpit.example.com@EXAMPLE.COM",
        )
    )
    db.flush()

    result = tls_jobs.renewal_check_job(db, {})

    assert result["action"] == "renewed_freeipa"
    active = service.get_active_certificate(db)
    assert active.fingerprint_sha256 != old_fingerprint
    assert active.source == TlsCertSource.FREEIPA


def test_renewal_check_does_nothing_when_freeipa_auto_renew_disabled(db, monkeypatch):
    monkeypatch.setattr(tls_jobs, "FreeIPAClient", FakeFreeIPAClient)
    _configure_freeipa_settings(db)
    row = freeipa_settings.get_settings_row(db)
    freeipa_settings.update_settings(db, row, {"auto_renew_enabled": False})
    now = datetime.now(UTC)
    db.add(
        TlsCertificate(
            source=TlsCertSource.FREEIPA,
            subject="pulpit.example.com",
            fingerprint_sha256="f" * 64,
            not_before=now - timedelta(days=300),
            not_after=now + timedelta(days=1),
        )
    )
    db.flush()

    result = tls_jobs.renewal_check_job(db, {})

    assert result == {"action": "none"}


def test_renewal_check_reports_but_does_not_raise_on_a_freeipa_failure(db, monkeypatch):
    class FailingClient(FakeFreeIPAClient):
        def login(self, username, password):
            raise FreeIPAAdapterError("IPA server unreachable")

    monkeypatch.setattr(tls_jobs, "FreeIPAClient", FailingClient)
    _configure_freeipa_settings(db)
    now = datetime.now(UTC)
    db.add(
        TlsCertificate(
            source=TlsCertSource.FREEIPA,
            subject="pulpit.example.com",
            fingerprint_sha256="a" * 64,
            not_before=now - timedelta(days=300),
            not_after=now + timedelta(days=1),
        )
    )
    db.flush()

    result = tls_jobs.renewal_check_job(db, {})

    assert result["action"] == "renewal_failed"
    assert "IPA server unreachable" in result["error"]


def _client(db, *, is_staff: bool):
    def _override_db():
        yield db

    def _override_full_user():
        return FullUser(username="admin", pulp_href="/pulp/api/v3/users/1/", is_staff=is_staff)

    main_module.app.dependency_overrides[get_db] = _override_db
    main_module.app.dependency_overrides[get_full_user] = _override_full_user
    return TestClient(main_module.app)


def test_get_freeipa_settings_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.get("/api/v1/tls/freeipa/settings")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_patch_freeipa_settings_never_returns_the_raw_password(db):
    client = _client(db, is_staff=True)
    try:
        response = client.patch(
            "/api/v1/tls/freeipa/settings",
            json={"service_password": "s3cret", "base_url": "https://ipa.example.test"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["service_password_is_set"] is True
        assert "s3cret" not in response.text
    finally:
        main_module.app.dependency_overrides.clear()


def test_wizard_setup_stores_only_the_new_account_credentials(db, monkeypatch):
    def _fake_run_wizard_setup(**kwargs):
        assert kwargs["admin_password"] == "admin-secret"
        steps = [{"step": "Authenticate as the IPA administrator", "status": "created", "detail": ""}]
        return True, steps, "generated-service-account-password"

    import app.modules.tls.routes.freeipa as freeipa_routes

    monkeypatch.setattr(freeipa_routes, "run_wizard_setup", _fake_run_wizard_setup)

    client = _client(db, is_staff=True)
    try:
        response = client.post(
            "/api/v1/tls/freeipa/wizard/setup",
            json={
                "base_url": "https://ipa.example.test",
                "verify_tls": True,
                "admin_username": "admin",
                "admin_password": "admin-secret",
                "common_name": "pulpit.example.com",
                "target_principal": "HTTP/pulpit.example.com@EXAMPLE.COM",
                "service_account_username": "svc-pulpit-tls",
                "ca": "ipa",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert "admin-secret" not in response.text
        assert "generated-service-account-password" not in response.text

        row = freeipa_settings.get_settings_row(db)
        from app.core.crypto import decrypt_secret

        assert decrypt_secret(row.service_password_encrypted) == "generated-service-account-password"
        assert row.service_username == "svc-pulpit-tls"
        assert row.enabled is True
    finally:
        main_module.app.dependency_overrides.clear()


def test_wizard_setup_does_not_save_settings_on_total_failure(db, monkeypatch):
    def _fake_run_wizard_setup(**kwargs):
        return False, [{"step": "Authenticate as the IPA administrator", "status": "failed", "detail": "bad creds"}], None

    import app.modules.tls.routes.freeipa as freeipa_routes

    monkeypatch.setattr(freeipa_routes, "run_wizard_setup", _fake_run_wizard_setup)

    client = _client(db, is_staff=True)
    try:
        response = client.post(
            "/api/v1/tls/freeipa/wizard/setup",
            json={
                "base_url": "https://ipa.example.test",
                "admin_username": "admin",
                "admin_password": "wrong",
                "common_name": "pulpit.example.com",
                "target_principal": "HTTP/pulpit.example.com@EXAMPLE.COM",
                "service_account_username": "svc-pulpit-tls",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is False

        row = freeipa_settings.get_settings_row(db)
        assert row.service_password_is_set is False
    finally:
        main_module.app.dependency_overrides.clear()
