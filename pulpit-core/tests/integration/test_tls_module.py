"""Integration tests for the tls module: self-signed generation actually
writes cert/key files and an active-certificate row, the renewal heartbeat
only acts on a self-signed certificate nearing expiry, manual upload
validates and installs synchronously, and the staff-gated routes behave the
same way signing's own routes do."""

import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

import app.main as main_module
from app.core.auth import FullUser, get_full_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.jobs.service import get_job
from app.modules.tls import jobs as tls_jobs
from app.modules.tls import service
from app.modules.tls.models import TlsCertificate, TlsCertSource
from app.modules.tls.selfsigned import generate_selfsigned


def _use_tmp_cert_dir(monkeypatch, db_settings, tmp_path):
    tmp_settings = db_settings.model_copy(update={"tls_cert_dir": tmp_path})
    monkeypatch.setattr(tls_jobs, "get_settings", lambda: tmp_settings)
    monkeypatch.setattr(service, "get_settings", lambda: tmp_settings)
    return tmp_settings


def test_generate_selfsigned_job_writes_cert_and_key_and_creates_active_row(
    db, tmp_path, monkeypatch
):
    _use_tmp_cert_dir(monkeypatch, get_settings(), tmp_path)

    result = tls_jobs.generate_selfsigned_job(db, {"triggered_by": "manual"})

    assert (tmp_path / "active" / "cert.pem").read_text().startswith("-----BEGIN CERTIFICATE-----")
    assert (tmp_path / "active" / "key.pem").read_text().startswith("-----BEGIN PRIVATE KEY-----")
    assert (tmp_path / "reload-requested").exists()

    active = service.get_active_certificate(db)
    assert active is not None
    assert active.source == TlsCertSource.SELF_SIGNED
    assert active.fingerprint_sha256 == result["fingerprint"]
    validity = active.not_after - active.not_before
    assert timedelta(days=729, hours=23) < validity <= timedelta(days=730)


def test_renewal_check_noops_when_self_signed_cert_is_far_from_expiry(db, tmp_path, monkeypatch):
    settings = _use_tmp_cert_dir(monkeypatch, get_settings(), tmp_path)
    now = datetime.now(UTC)
    db.add(
        TlsCertificate(
            source=TlsCertSource.SELF_SIGNED,
            subject="pulpit.local",
            fingerprint_sha256="a" * 64,
            not_before=now,
            not_after=now + timedelta(days=settings.tls_warn_days + 100),
        )
    )
    db.flush()

    result = tls_jobs.renewal_check_job(db, {})

    assert result == {"action": "none"}


def test_renewal_check_renews_a_self_signed_cert_nearing_expiry(db, tmp_path, monkeypatch):
    settings = _use_tmp_cert_dir(monkeypatch, get_settings(), tmp_path)
    now = datetime.now(UTC)
    old_fingerprint = "b" * 64
    db.add(
        TlsCertificate(
            source=TlsCertSource.SELF_SIGNED,
            subject="pulpit.local",
            fingerprint_sha256=old_fingerprint,
            not_before=now - timedelta(days=700),
            not_after=now + timedelta(days=settings.tls_warn_days - 1),
        )
    )
    db.flush()

    result = tls_jobs.renewal_check_job(db, {})

    assert result["action"] == "renewed_selfsigned"
    active = service.get_active_certificate(db)
    assert active.fingerprint_sha256 != old_fingerprint
    assert active.source == TlsCertSource.SELF_SIGNED


def test_renewal_check_noops_for_a_manually_installed_cert_even_near_expiry(db):
    """No key material pulpit-core can regenerate on the admin's behalf for a
    manually-uploaded certificate - this is purely a warning-surfacing case
    (Overview page), not something the heartbeat can act on."""
    now = datetime.now(UTC)
    db.add(
        TlsCertificate(
            source=TlsCertSource.MANUAL,
            subject="pulpit.example.com",
            fingerprint_sha256="c" * 64,
            not_before=now - timedelta(days=300),
            not_after=now + timedelta(days=1),
        )
    )
    db.flush()

    result = tls_jobs.renewal_check_job(db, {})

    assert result == {"action": "none"}


def _client(db, *, is_staff: bool):
    def _override_db():
        yield db

    def _override_full_user():
        return FullUser(username="admin", pulp_href="/pulp/api/v3/users/1/", is_staff=is_staff)

    main_module.app.dependency_overrides[get_db] = _override_db
    main_module.app.dependency_overrides[get_full_user] = _override_full_user
    return TestClient(main_module.app)


def test_get_active_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.get("/api/v1/tls/active")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_get_active_404s_when_no_certificate_installed_yet(db):
    client = _client(db, is_staff=True)
    try:
        response = client.get("/api/v1/tls/active")
        assert response.status_code == 404
    finally:
        main_module.app.dependency_overrides.clear()


def test_get_active_returns_expiry_and_warning_fields(db):
    now = datetime.now(UTC)
    db.add(
        TlsCertificate(
            source=TlsCertSource.SELF_SIGNED,
            subject="pulpit.local",
            fingerprint_sha256="d" * 64,
            not_before=now,
            not_after=now + timedelta(days=5),
        )
    )
    db.flush()
    db.commit()

    client = _client(db, is_staff=True)
    try:
        response = client.get("/api/v1/tls/active")
        assert response.status_code == 200
        body = response.json()
        assert body["source"] == "self_signed"
        assert body["is_expiring_soon"] is True
    finally:
        main_module.app.dependency_overrides.clear()


def test_regenerate_selfsigned_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.post("/api/v1/tls/selfsigned/regenerate")
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_regenerate_selfsigned_enqueues_a_job_for_staff(db):
    client = _client(db, is_staff=True)
    try:
        response = client.post("/api/v1/tls/selfsigned/regenerate")
        assert response.status_code == 202
        body = response.json()
        assert body["job_type"] == "tls.generate_selfsigned"
        assert body["status"] == "queued"
        assert body["requested_by"] == "admin"
        assert get_job(db, uuid.UUID(body["id"])) is not None
    finally:
        main_module.app.dependency_overrides.clear()


def test_upload_manual_certificate_requires_staff(db):
    client = _client(db, is_staff=False)
    try:
        response = client.post("/api/v1/tls/manual", json={"cert_pem": "x", "key_pem": "y"})
        assert response.status_code == 403
    finally:
        main_module.app.dependency_overrides.clear()


def test_upload_manual_certificate_installs_a_valid_pair_synchronously(db):
    generated = generate_selfsigned(common_name="uploaded.example.com", validity_days=365)
    client = _client(db, is_staff=True)
    try:
        response = client.post(
            "/api/v1/tls/manual",
            json={"cert_pem": generated.cert_pem, "key_pem": generated.key_pem},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["source"] == "manual"
        assert body["fingerprint_sha256"] == generated.fingerprint_sha256

        active = service.get_active_certificate(db)
        assert active.source == TlsCertSource.MANUAL
    finally:
        main_module.app.dependency_overrides.clear()


def test_upload_manual_certificate_rejects_a_mismatched_key_with_400(db):
    cert = generate_selfsigned(common_name="uploaded.example.com", validity_days=365)
    other = generate_selfsigned(common_name="other.example.com", validity_days=365)
    client = _client(db, is_staff=True)
    try:
        response = client.post(
            "/api/v1/tls/manual",
            json={"cert_pem": cert.cert_pem, "key_pem": other.key_pem},
        )
        assert response.status_code == 400
        assert "does not match" in response.json()["detail"]
    finally:
        main_module.app.dependency_overrides.clear()
