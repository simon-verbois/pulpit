"""Job handler for the trusted_ca module - reconciles Pulp's own OCI-image
CA trust store with every currently-stored TrustedCaCertificate row, via
whatever PulpCommandExecutor is configured (same automation mechanism as
signing's Pulp-service bootstrap, app/adapters/pulp/executor.py). Only ever
executed by pulpit-worker's loop (worker/main.py) - the API process only
enqueues rows into the `jobs` table (routes/certificates.py) and this
module's own rows are just data until a job actually syncs them.
"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.pulp.ca_trust import build_sync_script
from app.adapters.pulp.executor import ExecutorUnavailableError, build_executor
from app.core.config import get_settings
from app.core.jobs.registry import job_registry
from app.modules.trusted_ca.models import TrustedCaCertificate, TrustedCaStatus

MODULE = "trusted_ca"
logger = logging.getLogger(__name__)


def sync_job(db: Session, payload: dict) -> dict:
    """Always safe to re-run, and always processes the FULL current set of
    rows (never a diff) - a certificate deleted from the table is removed
    from Pulp's trust store on the very next sync, not just no-longer-added
    (build_sync_script's own docstring). No executor configured leaves
    every not-yet-APPLIED row PENDING - the same "automation is best-effort,
    fall back to nothing changes" behavior signing's bootstrap job uses,
    there is no manual command to print here (the point of this module is
    that copying a file into a running container isn't a command an
    administrator can usefully run from the PulpIT UI itself - only future
    doc guidance).
    """
    rows = list(db.execute(select(TrustedCaCertificate)).scalars())
    executor = build_executor(get_settings())

    if executor is None:
        for row in rows:
            if row.status != TrustedCaStatus.APPLIED:
                row.status = TrustedCaStatus.PENDING
                row.last_error = None
        db.flush()
        return {"executor_configured": False, "certificate_count": len(rows)}

    script = build_sync_script([(row.name, row.pem) for row in rows])
    try:
        result = executor.run_shell(script)
    except ExecutorUnavailableError as exc:
        logger.warning("Trusted CA sync could not reach the Pulp container: %s", exc)
        for row in rows:
            row.status = TrustedCaStatus.FAILED
            row.last_error = str(exc)
        db.flush()
        return {"executor_configured": True, "error": str(exc)}

    if not result.ok:
        logger.warning("Trusted CA sync failed (exit %s): %s", result.exit_code, result.stderr)
    for row in rows:
        if result.ok:
            row.status = TrustedCaStatus.APPLIED
            row.last_error = None
        else:
            row.status = TrustedCaStatus.FAILED
            row.last_error = result.stderr[-2000:]
    db.flush()
    return {
        "executor_configured": True,
        "certificate_count": len(rows),
        "exit_code": result.exit_code,
    }


def register() -> None:
    job_registry.register("trusted_ca.sync", sync_job)
