"""Read/write helpers for `rpm_signing_cache` (models.py) - the
`(source_sha256, fingerprint) -> signed_content_href` idempotency cache
`resign_repository_packages_job` (jobs.py) uses to skip packages it has
already resigned, resume after a crash, and avoid two workers racing to
resign the same source package at once.

Every function here does exactly one, small, synchronous DB operation and
is always called from the main job-handling thread - never from inside a
`ThreadPoolExecutor` worker (see jobs.py's own "thread-safe/DB-safe" note).
This keeps the module trivially safe to reason about even though the
callers around it are parallel.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.signing.models import RpmSigningCache, RpmSigningCacheStatus

# How long a row is allowed to sit in RUNNING before a later run treats it as
# abandoned (worker crash/restart) rather than "another worker is on it right
# now" - generous relative to a single package's realistic
# download+rpmsign+upload time, short enough that a genuinely stuck job
# doesn't block retries for long.
_STALE_RUNNING_AFTER = timedelta(minutes=15)


def _get(db: Session, *, source_sha256: str, fingerprint: str) -> RpmSigningCache | None:
    return db.execute(
        select(RpmSigningCache).where(
            RpmSigningCache.source_sha256 == source_sha256,
            RpmSigningCache.fingerprint == fingerprint,
        )
    ).scalars().first()


def bulk_lookup(
    db: Session, fingerprint: str, source_sha256s: list[str]
) -> dict[str, RpmSigningCache]:
    """One query for every candidate in a batch, instead of one per
    package - the whole point of the cache is to make a repository with
    tens of thousands of packages cheap to re-evaluate."""
    unique = sorted(set(source_sha256s))
    if not unique:
        return {}
    stmt = select(RpmSigningCache).where(
        RpmSigningCache.fingerprint == fingerprint,
        RpmSigningCache.source_sha256.in_(unique),
    )
    return {row.source_sha256: row for row in db.execute(stmt).scalars()}


def is_stale_running(row: RpmSigningCache, *, now: datetime | None = None) -> bool:
    now = now or datetime.now(UTC)
    return (now - row.updated_at) > _STALE_RUNNING_AFTER


def mark_running(db: Session, *, source_sha256: str, fingerprint: str, source_content_href: str) -> None:
    row = _get(db, source_sha256=source_sha256, fingerprint=fingerprint)
    if row is None:
        row = RpmSigningCache(source_sha256=source_sha256, fingerprint=fingerprint)
        db.add(row)
    row.source_content_href = source_content_href
    row.status = RpmSigningCacheStatus.RUNNING
    row.last_error = None
    db.flush()


def mark_success(
    db: Session,
    *,
    source_sha256: str,
    fingerprint: str,
    signed_sha256: str,
    signed_content_href: str,
) -> None:
    row = _get(db, source_sha256=source_sha256, fingerprint=fingerprint)
    if row is None:
        row = RpmSigningCache(source_sha256=source_sha256, fingerprint=fingerprint)
        db.add(row)
    row.signed_sha256 = signed_sha256
    row.signed_content_href = signed_content_href
    row.status = RpmSigningCacheStatus.SUCCESS
    row.signed_at = datetime.now(UTC)
    row.last_error = None
    db.flush()


def mark_failed(db: Session, *, source_sha256: str, fingerprint: str, error: str) -> None:
    row = _get(db, source_sha256=source_sha256, fingerprint=fingerprint)
    if row is None:
        row = RpmSigningCache(source_sha256=source_sha256, fingerprint=fingerprint)
        db.add(row)
    row.status = RpmSigningCacheStatus.FAILED
    # Same truncation discipline as Job.error (worker/main.py) - long enough
    # to diagnose, capped to avoid persisting an unexpectedly large blob.
    row.last_error = error[:2000]
    db.flush()
