import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.jobs.models import Job, JobStatus


def enqueue_job(
    db: Session,
    job_type: str,
    payload: dict | None = None,
    *,
    requested_by: str | None = None,
    run_at: datetime | None = None,
) -> Job:
    job = Job(
        job_type=job_type,
        payload=payload or {},
        status=JobStatus.QUEUED,
        scheduled_at=run_at or datetime.now(UTC),
        max_attempts=get_settings().job_max_attempts,
        requested_by=requested_by,
    )
    db.add(job)
    db.flush()
    return job


def get_job(db: Session, job_id: uuid.UUID) -> Job | None:
    return db.get(Job, job_id)


def has_pending_job(db: Session, job_type: str) -> bool:
    """True if a job of this type is already queued or running - lets a
    scheduler (worker/main.py) skip re-enqueueing a periodic job whose
    previous run is still in flight (a real possibility for a job that pages
    through a large, unbounded Pulp dataset, e.g. signing.apply_signing_to_all_repositories),
    rather than piling up duplicates that would all do the same expensive
    work concurrently."""
    stmt = select(
        exists().where(
            Job.job_type == job_type,
            Job.status.in_([JobStatus.QUEUED, JobStatus.RUNNING]),
        )
    )
    return bool(db.execute(stmt).scalar())


def has_matching_pending_job(db: Session, job_type: str, *, payload_subset: dict) -> bool:
    """Like `has_pending_job` above, but for a job_type that's naturally keyed
    by more than just its type - e.g. `signing.resign_repository_packages` is
    really keyed by `(repository_href, fingerprint)`, so two different
    repositories must each be able to have their own job in flight at once,
    while the same repository+fingerprint pair must never get a second,
    redundant one queued/running concurrently.

    Loads every QUEUED/RUNNING job of this type and checks in Python rather
    than querying JSON fields in SQL: the `payload` column is generic JSON
    (see Job's own docstring - portable across SQLite and Postgres, never
    Postgres-only JSONB), so there is no dialect-portable "does this JSON
    column contain these keys/values" query to write instead. The number of
    concurrently in-flight jobs of one type is always small in practice, so
    this is cheap.
    """
    stmt = select(Job).where(Job.job_type == job_type, Job.status.in_([JobStatus.QUEUED, JobStatus.RUNNING]))
    for job in db.execute(stmt).scalars():
        if all(job.payload.get(key) == value for key, value in payload_subset.items()):
            return True
    return False


def claim_next_job(db: Session, job_types: list[str]) -> Job | None:
    """Atomically claims the oldest due, queued job of one of `job_types`.

    The lifetime worker lock serializes claims on both SQLite and PostgreSQL.
    PostgreSQL row locking additionally protects the claim transaction itself.
    """
    now = datetime.now(UTC)
    stmt = (
        select(Job)
        .where(Job.status == JobStatus.QUEUED, Job.scheduled_at <= now, Job.job_type.in_(job_types))
        .order_by(Job.scheduled_at)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    job = db.execute(stmt).scalar_one_or_none()
    if job is None:
        return None
    job.status = JobStatus.RUNNING
    job.started_at = now
    job.attempts += 1
    db.flush()
    return job


def mark_succeeded(db: Session, job: Job, result: dict | None = None) -> None:
    job.status = JobStatus.SUCCESS
    job.error = None
    job.result = result or {}
    job.finished_at = datetime.now(UTC)
    db.flush()


def mark_failed(db: Session, job: Job, error: str) -> None:
    """Fails the job, or requeues it with backoff if attempts remain."""
    if job.attempts < job.max_attempts:
        job.status = JobStatus.QUEUED
        job.scheduled_at = datetime.now(UTC) + timedelta(
            seconds=min(60, 2**job.attempts)
        )
        job.error = error
    else:
        job.status = JobStatus.FAILED
        job.error = error
        job.finished_at = datetime.now(UTC)
    db.flush()
