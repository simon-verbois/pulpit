"""`rpm_signing_cache` (app/modules/signing/rpm_signing_cache.py) - the
`(source_sha256, fingerprint) -> signed_content_href` idempotency cache
`resign_repository_packages_job` reads/writes."""

from datetime import UTC, datetime, timedelta

from app.modules.signing import rpm_signing_cache
from app.modules.signing.models import RpmSigningCache, RpmSigningCacheStatus

FINGERPRINT = "A" * 40


def test_bulk_lookup_returns_only_matching_fingerprint_rows(db):
    db.add(RpmSigningCache(source_sha256="s1", fingerprint=FINGERPRINT, status=RpmSigningCacheStatus.SUCCESS))
    db.add(RpmSigningCache(source_sha256="s1", fingerprint="B" * 40, status=RpmSigningCacheStatus.SUCCESS))
    db.flush()

    result = rpm_signing_cache.bulk_lookup(db, FINGERPRINT, ["s1", "s2"])

    assert set(result) == {"s1"}


def test_mark_running_then_success_updates_the_same_row(db):
    rpm_signing_cache.mark_running(db, source_sha256="s1", fingerprint=FINGERPRINT, source_content_href="/old/")
    rpm_signing_cache.mark_success(
        db, source_sha256="s1", fingerprint=FINGERPRINT, signed_sha256="s1-signed", signed_content_href="/new/"
    )

    rows = db.query(RpmSigningCache).filter_by(source_sha256="s1", fingerprint=FINGERPRINT).all()
    assert len(rows) == 1
    assert rows[0].status == RpmSigningCacheStatus.SUCCESS
    assert rows[0].signed_content_href == "/new/"


def test_mark_failed_records_the_error(db):
    rpm_signing_cache.mark_failed(db, source_sha256="s1", fingerprint=FINGERPRINT, error="rpmsign exited 1")

    row = db.query(RpmSigningCache).filter_by(source_sha256="s1", fingerprint=FINGERPRINT).one()
    assert row.status == RpmSigningCacheStatus.FAILED
    assert row.last_error == "rpmsign exited 1"


def test_is_stale_running_uses_the_configured_threshold(db):
    row = RpmSigningCache(source_sha256="s1", fingerprint=FINGERPRINT, status=RpmSigningCacheStatus.RUNNING)
    db.add(row)
    db.flush()
    assert rpm_signing_cache.is_stale_running(row) is False

    row.updated_at = datetime.now(UTC) - timedelta(hours=1)
    db.flush()
    assert rpm_signing_cache.is_stale_running(row) is True
