"""pulpit-worker entrypoint (task section 1/2/12).

This is the ONLY process in the whole stack that:
- has the signing GNUPGHOME volume mounted (compose.yml), and
- actually calls into app.modules.signing.gpg_local (imported lazily inside
  job handler bodies - see jobs.py).

It is a small polling loop with one worker per database (worker/lock.py).
Job claims and completion use short transactions; external work never holds
an uncommitted RUNNING update. Interrupted jobs fail visibly on restart.

Also runs every module's periodic heartbeat jobs (task section 6: "Rotation
checks should be executed asynchronously/scheduled, not during ordinary HTTP
requests" - the same reasoning now generalized to any module, e.g.
TLS certificate renewal) - a plain interval timer per job_type is
enough for this project's scale; see docs/signing.md for why APScheduler/
Celery-beat were not pulled in for this.
"""

import logging
import signal
import time
from datetime import UTC, datetime

from app.core.config import get_settings
from app.core.database import session_scope
from app.core.jobs.models import Job, JobStatus
from app.core.jobs.registry import job_registry
from app.core.jobs.service import (
    claim_next_job,
    enqueue_job,
    has_pending_job,
    mark_failed,
    mark_succeeded,
)
from app.modules.registry import build_scheduled_jobs, register_all
from worker.lock import worker_lock

logging.basicConfig(level=get_settings().log_level)
logger = logging.getLogger("pulpit-worker")

_SHUTDOWN = False


def _handle_signal(signum, frame) -> None:  # noqa: ANN001 - stdlib signal signature
    global _SHUTDOWN
    logger.info("Received signal %s, shutting down after current job", signum)
    _SHUTDOWN = True


def _run_one_job() -> bool:
    with session_scope() as db:
        job = claim_next_job(db, job_registry.known_types())
        if job is None:
            return False
        job_id, job_type, payload = job.id, job.job_type, job.payload
    # Publish RUNNING and release SQLite's writer before external work.
    try:
        handler = job_registry.get(job_type)
        if handler is None:
            raise ValueError(f"No handler registered for {job_type}")
        with session_scope() as db, db.no_autoflush:
            result = handler(db, payload)
            job = db.get(Job, job_id)
            if job is None:
                raise RuntimeError("Claimed job disappeared") from None
            mark_succeeded(db, job, result)
    except Exception as exc:
        logger.error("Job %s failed: %s", job_id, exc)
        # The handler's failed transaction must be rolled back before
        # persisting its failure, including IntegrityError failures.
        with session_scope() as db:
            job = db.get(Job, job_id)
            if job is None:
                raise RuntimeError("Claimed job disappeared") from None
            mark_failed(db, job, str(exc)[:2000])
    return True


def _recover_interrupted_jobs() -> None:
    with session_scope() as db:
        for job in db.query(Job).filter(Job.status == JobStatus.RUNNING).all():
            # External effects may already have happened. Never replay a
            # key generation/rotation blindly after process termination.
            job.status = JobStatus.FAILED
            job.error = "Worker interrupted; inspect the operation before submitting it again."
            job.finished_at = datetime.now(UTC)


def _maybe_schedule(job_type: str, interval_seconds: int, last_check: datetime) -> datetime:
    now = datetime.now(UTC)
    if (now - last_check).total_seconds() < interval_seconds:
        return last_check
    with session_scope() as db:
        # Skips re-enqueueing while a previous run of this same job_type is
        # still queued/running - matters for a job that could plausibly take
        # longer than its own interval (for example certificate renewal), not for a normally-fast one
        # like signing.rotation_check, but applying it uniformly is simpler
        # and harmless either way.
        if not has_pending_job(db, job_type):
            enqueue_job(db, job_type, {})
    return now


def _main_locked() -> None:
    register_all()
    _recover_interrupted_jobs()
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)
    logger.info("pulpit-worker started, known job types: %s", job_registry.known_types())

    scheduled_jobs = build_scheduled_jobs()
    epoch = datetime.fromtimestamp(0, tz=UTC)
    last_checked: dict[str, datetime] = {job_type: epoch for job_type, _ in scheduled_jobs}
    poll_interval = get_settings().job_poll_interval_seconds
    while not _SHUTDOWN:
        for job_type, interval_seconds in scheduled_jobs:
            last_checked[job_type] = _maybe_schedule(
                job_type, interval_seconds, last_checked[job_type]
            )
        worked = _run_one_job()
        if not worked:
            time.sleep(poll_interval)


def main() -> None:
    with worker_lock():
        _main_locked()


if __name__ == "__main__":
    main()
