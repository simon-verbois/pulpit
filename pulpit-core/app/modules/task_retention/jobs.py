"""Daily purge of Pulp's finished task history."""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.adapters.pulp.client import get_pulp_client
from app.adapters.pulp.exceptions import PulpAdapterError
from app.core.jobs.registry import job_registry
from app.modules.task_retention import service

PURGE_JOB_TYPE = "task_retention.purge"
# Pulp only accepts final states; every one of them is history once old enough.
PURGED_STATES = ["completed", "failed", "canceled", "skipped"]


def purge_job(db: Session, payload: dict) -> dict:
    """`payload.manual` (the "Purge now" button) runs even when the automatic
    purge is switched off; the daily heartbeat does not. A successful job
    means Pulp finished the purge, not just that it accepted the request."""
    row = service.get_settings_row(db)
    if not row.enabled and not payload.get("manual"):
        return {"skipped": "automatic purge is disabled"}

    now = datetime.now(UTC)
    cutoff = now - timedelta(days=row.retention_days)
    # Persist first-use defaults and release SQLite's writer before polling Pulp.
    db.commit()
    try:
        pulp = get_pulp_client()
        response = pulp.purge_tasks(finished_before=cutoff, states=PURGED_STATES)
        task_href = response.get("task")
        if not isinstance(task_href, str) or not task_href:
            raise PulpAdapterError("Pulp did not return a purge task")
        task = pulp.wait_for_task(task_href)
        if task.get("state") != "completed":
            error = task.get("error")
            error = error if isinstance(error, dict) else {}
            detail = error.get("description") or error.get("reason") or task.get("state")
            raise PulpAdapterError(f"Pulp purge did not complete: {detail} ({task_href})")
    except PulpAdapterError as exc:
        row.last_run_at = datetime.now(UTC)
        row.last_run_error = str(exc)[:2000]
        # The worker rolls back a handler that raises. Diagnostics must survive
        # that rollback so automatic failures remain visible in Administration.
        db.commit()
        raise
    row.last_run_at = datetime.now(UTC)
    row.last_run_error = None
    db.flush()
    return {"finished_before": cutoff.isoformat(), "pulp_task": task_href}


def register() -> None:
    job_registry.register(PURGE_JOB_TYPE, purge_job)
