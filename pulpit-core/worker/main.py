"""pulpit-worker entrypoint (task section 1/2/12).

This is the ONLY process in the whole stack that:
- has the signing GNUPGHOME volume mounted (compose.yml), and
- actually calls into app.modules.signing.gpg_local (imported lazily inside
  job handler bodies - see jobs.py).

It is a small polling loop, not a new infrastructure dependency (task
section 12: "Do not introduce a large unrelated infrastructure dependency
unless justified") - jobs live in pulpit-core's own Postgres database
(app/core/jobs), claimed with `SELECT ... FOR UPDATE SKIP LOCKED` so
multiple replicas of this process are safe to run.

Also runs every module's periodic heartbeat jobs (task section 6: "Rotation
checks should be executed asynchronously/scheduled, not during ordinary HTTP
requests" - the same reasoning now generalized to any module, e.g.
content_size's hourly re-scan) - a plain interval timer per job_type is
enough for this project's scale; see docs/signing.md for why APScheduler/
Celery-beat were not pulled in for this.
"""

import logging
import signal
import time
from datetime import UTC, datetime

from app.core.config import get_settings
from app.core.database import session_scope
from app.core.jobs.registry import job_registry
from app.core.jobs.service import (
    claim_next_job,
    enqueue_job,
    has_pending_job,
    mark_failed,
    mark_succeeded,
)
from app.modules.registry import build_scheduled_jobs, register_all

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
        logger.info("Running job %s (%s), attempt %s", job.id, job.job_type, job.attempts)
        handler = job_registry.get(job.job_type)
        if handler is None:
            # Shouldn't happen in practice - claim_next_job only claims job
            # types job_registry.known_types() already reported above - but
            # guard against it explicitly rather than crashing the whole
            # worker loop on a None call if it ever does (e.g. a registry
            # mutated between the two calls).
            mark_failed(db, job, f"No handler registered for job type {job.job_type!r}")
            return True
        try:
            result = handler(db, job.payload)
            mark_succeeded(db, job, result)
            logger.info("Job %s succeeded", job.id)
        except Exception as exc:  # noqa: BLE001 - a job's own failure must never take the loop down
            # Never log full exception context here if it could contain
            # secret material (task section 15) - str(exc) only, GPG
            # operation errors already truncate/redact (gpg_local.py).
            logger.error("Job %s failed: %s", job.id, exc)
            mark_failed(db, job, str(exc)[:2000])
        return True


def _maybe_schedule(job_type: str, interval_seconds: int, last_check: datetime) -> datetime:
    now = datetime.now(UTC)
    if (now - last_check).total_seconds() < interval_seconds:
        return last_check
    with session_scope() as db:
        # Skips re-enqueueing while a previous run of this same job_type is
        # still queued/running - matters for a job that could plausibly take
        # longer than its own interval (content_size.refresh, paging an
        # unbounded amount of Pulp content), not for a normally-fast one
        # like signing.rotation_check, but applying it uniformly is simpler
        # and harmless either way.
        if not has_pending_job(db, job_type):
            enqueue_job(db, job_type, {})
    return now


def main() -> None:
    register_all()
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


if __name__ == "__main__":
    main()
