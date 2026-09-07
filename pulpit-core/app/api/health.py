"""Unauthenticated liveness/readiness probe, both for the Docker/Kubernetes
healthcheck (HTTP status code only, task/deployment convention already
depends on this - deployment/docker/compose.yml, deployment/kube/pulpit.yaml,
deployment/podman/pulpit.yaml all curl/GET this exact path) and for external
monitoring that wants a per-component breakdown ("le monitoring global").

Deliberately reveals nothing about signing/TLS/LDAP state and never echoes a
raw exception (task section 15 "avoid leaking ... in diagnostics") - every
`detail` below is a short, fixed, generic phrase.

The HTTP status code intentionally reflects ONLY whether pulpit-core's own
process is functional (the database) - not whether Pulp or the worker are
currently healthy. Kubernetes/Podman point BOTH their readinessProbe and
livenessProbe at this same path; if reaching Pulp or the worker being stale
also flipped the status code, a transient Pulp outage would make the
livenessProbe fail too and Kubernetes would kill and restart the pulpit pod
over a problem restarting it can't fix (Pulp being down doesn't get better by
restarting pulpit) - a classic liveness-probe anti-pattern. Those two
components are still fully reported in the response body's `components` map
for a monitoring tool that inspects it, just without forcing a non-2xx here.
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.adapters.pulp import PulpAdapterError, PulpClient
from app.core.config import get_settings
from app.core.database import get_db
from app.core.jobs.models import Job, JobStatus

router = APIRouter()


def _check_database(db: Session) -> dict:
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:  # noqa: BLE001 - a health check must never itself crash
        return {"status": "error", "detail": "Database is unreachable"}


def _check_pulp() -> dict:
    settings = get_settings()
    # A fresh, short-timeout client, never the shared @lru_cache'd
    # get_pulp_client() singleton - that one is built once from
    # pulp_request_timeout_seconds, which is deliberately much more patient
    # than a health probe should ever wait (see settings.py's own comment).
    client = PulpClient(
        settings.model_copy(
            update={"pulp_request_timeout_seconds": settings.health_check_pulp_timeout_seconds}
        )
    )
    try:
        client.get_status()
        return {"status": "ok"}
    except PulpAdapterError:
        return {"status": "error", "detail": "Pulp is unreachable"}


def _check_worker(db: Session) -> dict:
    try:
        last_finished = db.execute(
            select(Job.finished_at)
            .where(Job.status.in_([JobStatus.SUCCESS, JobStatus.FAILED]))
            .order_by(Job.finished_at.desc())
            .limit(1)
        ).scalar_one_or_none()
    except Exception:  # noqa: BLE001 - same reasoning as _check_database above
        return {"status": "error", "detail": "Could not read the job queue"}

    if last_finished is None:
        # Nothing has run yet - expected for the first few minutes after a
        # fresh boot, not itself a sign anything is wrong.
        return {"status": "ok"}

    stale_seconds = (datetime.now(UTC) - last_finished).total_seconds()
    if stale_seconds > get_settings().health_check_worker_stale_after_seconds:
        return {"status": "error", "detail": "No scheduled job has completed recently"}
    return {"status": "ok"}


@router.get("/health")
def health(db: Session = Depends(get_db)) -> JSONResponse:
    database = _check_database(db)
    if database["status"] != "ok":
        # Skipped, not "error": a Pulp-adapter call or a job-queue query
        # would just fail for the same underlying reason, adding nothing
        # worth reporting beyond what "database": "error" already says.
        components = {
            "database": database,
            "pulp": {"status": "skipped"},
            "worker": {"status": "skipped"},
        }
        return JSONResponse(status_code=503, content={"status": "error", "components": components})

    pulp = _check_pulp()
    worker = _check_worker(db)
    # "degraded", not "error", for anything short of the database itself
    # being down - see this module's own docstring on why that distinction
    # is also what keeps the HTTP status code at 200 here.
    overall = "ok" if pulp["status"] == "ok" and worker["status"] == "ok" else "degraded"
    components = {"database": database, "pulp": pulp, "worker": worker}
    return JSONResponse(status_code=200, content={"status": overall, "components": components})
