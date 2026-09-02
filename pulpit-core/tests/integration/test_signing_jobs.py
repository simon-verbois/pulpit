"""Key lifecycle state transitions (task section 16: "ACTIVE/NEXT/RETIRING/
RETIRED state transitions") against a real database. GPG itself is stubbed
out here for speed/determinism - test_gpg_local_integration.py below
exercises the real LocalGPGKeyManager end-to-end separately."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.jobs.registry import job_registry
from app.core.jobs.service import claim_next_job, mark_failed, mark_succeeded
from app.modules.signing import jobs as signing_jobs
from app.modules.signing import service
from app.modules.signing.key_manager import GeneratedKey
from app.modules.signing.models import KeyState, PulpServicePurpose, PulpServiceStatus, SigningPulpService


def _drain_jobs(db, *, max_jobs: int = 20) -> list[str]:
    """Runs every queued job in-process, like pulpit-worker's loop but
    synchronously against the test's own session - lets tests exercise the
    real enqueue -> execute pipeline (generate_key_job enqueues
    signing.publish_key rather than activating inline) without a real
    worker process."""
    ran = []
    for _ in range(max_jobs):
        job = claim_next_job(db, job_registry.known_types())
        if job is None:
            break
        ran.append(job.job_type)
        handler = job_registry.get(job.job_type)
        try:
            result = handler(db, job.payload)
            mark_succeeded(db, job, result)
        except Exception as exc:  # noqa: BLE001 - mirrors worker/main.py's isolation
            mark_failed(db, job, str(exc))
    return ran


class _FakeKeyManager:
    def __init__(self):
        self.counter = 0

    def generate_key(self, *, identity_name, identity_email, algorithm, validity_days):
        self.counter += 1
        now = datetime.now(timezone.utc)
        return GeneratedKey(
            fingerprint=f"{self.counter:040d}".replace("0", "A")[:40],
            key_id=f"KEYID{self.counter}",
            public_key_armor=f"-----BEGIN PGP PUBLIC KEY BLOCK-----\nfake-{self.counter}\n-----END PGP PUBLIC KEY BLOCK-----\n",
            created_at=now,
            expires_at=now + timedelta(days=validity_days) if validity_days else None,
        )

    def export_public_key(self, fingerprint):
        return f"-----BEGIN PGP PUBLIC KEY BLOCK-----\n{fingerprint}\n-----END PGP PUBLIC KEY BLOCK-----\n"

    def extend_expiration(self, fingerprint, new_validity_days):
        return datetime.now(timezone.utc) + timedelta(days=new_validity_days)


@pytest.fixture(autouse=True)
def fake_key_manager(monkeypatch):
    manager = _FakeKeyManager()
    monkeypatch.setattr(signing_jobs, "_local_key_manager", lambda: manager)
    return manager


def test_generate_key_with_no_active_key_enqueues_activation(db):
    result = signing_jobs.generate_key_job(db, {"triggered_by": "manual"})
    key = service.get_key(db, result["key_id"])
    assert key.state == KeyState.NEXT  # not activated yet - see _drain_jobs

    ran = _drain_jobs(db)
    assert "signing.publish_key" in ran
    key = service.get_key(db, result["key_id"])
    assert key.state == KeyState.ACTIVE
    assert key.activated_at is not None


def test_generate_second_key_stays_next_until_activated(db):
    signing_jobs.generate_key_job(db, {"triggered_by": "manual"})
    _drain_jobs(db)  # activates the first key
    result = signing_jobs.generate_key_job(db, {"triggered_by": "manual"})
    key = service.get_key(db, result["key_id"])
    assert key.state == KeyState.NEXT
    assert service.get_active_key(db) is not None


def test_activate_next_key_retires_old_active(db):
    first = signing_jobs.generate_key_job(db, {"triggered_by": "manual"})
    _drain_jobs(db)
    second = signing_jobs.generate_key_job(db, {"triggered_by": "manual"})

    signing_jobs.publish_key_job(db, {"key_id": second["key_id"], "triggered_by": "manual"})

    old_key = service.get_key(db, first["key_id"])
    new_key = service.get_key(db, second["key_id"])
    assert old_key.state == KeyState.RETIRING
    assert old_key.retiring_at is not None
    assert new_key.state == KeyState.ACTIVE


def test_retire_key_job_requires_retention_state(db):
    result = signing_jobs.generate_key_job(db, {"triggered_by": "manual"})
    _drain_jobs(db)
    key = service.get_key(db, result["key_id"])
    # Freshly activated, never retiring - retire_key_job is a no-op here.
    outcome = signing_jobs.retire_key_job(db, {"key_id": str(key.id)})
    assert outcome["status"] == "skipped"
    assert service.get_key(db, key.id).state == KeyState.ACTIVE


def test_retire_key_job_transitions_retiring_to_retired(db):
    result = signing_jobs.generate_key_job(db, {"triggered_by": "manual"})
    _drain_jobs(db)
    key = service.get_key(db, result["key_id"])
    key.state = KeyState.RETIRING
    key.retiring_at = datetime.now(timezone.utc) - timedelta(days=1)
    db.flush()

    outcome = signing_jobs.retire_key_job(db, {"key_id": str(key.id)})
    assert outcome["status"] == "retired"
    assert service.get_key(db, key.id).state == KeyState.RETIRED


def test_generate_key_rejects_no_expiration_when_policy_disallows(db):
    with pytest.raises(ValueError, match="disabled by policy"):
        signing_jobs.generate_key_job(db, {"no_expiration": True})


def test_generate_key_allows_no_expiration_when_policy_enabled(db):
    settings_row = service.get_settings_row(db)
    settings_row.allow_indefinite_validity = True
    db.flush()
    result = signing_jobs.generate_key_job(db, {"no_expiration": True})
    key = service.get_key(db, result["key_id"])
    assert key.expires_at is None


def test_package_signing_creates_one_pending_pulp_service_row(db):
    settings_row = service.get_settings_row(db)
    settings_row.package_signing_enabled = True
    db.flush()
    signing_jobs.generate_key_job(db, {"triggered_by": "manual"})

    rows = db.query(SigningPulpService).filter(SigningPulpService.purpose == PulpServicePurpose.PACKAGE).all()
    assert len(rows) == 1
    assert rows[0].status == PulpServiceStatus.PENDING_MANUAL_SETUP
    assert "add-signing-service" in rows[0].bootstrap_command


def test_second_key_reuses_existing_package_service_row(db):
    settings_row = service.get_settings_row(db)
    settings_row.package_signing_enabled = True
    db.flush()
    signing_jobs.generate_key_job(db, {"triggered_by": "manual"})
    signing_jobs.generate_key_job(db, {"triggered_by": "manual"})

    rows = db.query(SigningPulpService).filter(SigningPulpService.purpose == PulpServicePurpose.PACKAGE).all()
    # Package signing never needs a second Pulp SigningService - the
    # fingerprint override does the rotating (models.py docstring).
    assert len(rows) == 1


def test_metadata_signing_creates_new_row_per_key(db):
    settings_row = service.get_settings_row(db)
    settings_row.metadata_signing_enabled = True
    db.flush()
    signing_jobs.generate_key_job(db, {"triggered_by": "manual"})
    signing_jobs.generate_key_job(db, {"triggered_by": "manual"})

    rows = db.query(SigningPulpService).filter(SigningPulpService.purpose == PulpServicePurpose.METADATA).all()
    # Metadata signing services are immutable in Pulp - each key gets its own row.
    assert len(rows) == 2
