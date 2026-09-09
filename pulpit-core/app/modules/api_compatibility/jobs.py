"""Checks that every Pulp API path this app's frontend depends on
(manifest.used_endpoints) still exists on the connected Pulp instance's own
OpenAPI schema. Enqueued exactly once, at pulpit-worker startup
(worker/main.py, right after register_all()) - deliberately NOT in this
module's own `scheduled_jobs` (app/modules/registry.py), which would make
worker/main.py's generic scheduler loop re-run it on a timer. A container
restart runs it again (a fresh worker startup), which is the intended
"once per launch" behavior - nothing re-triggers it while the container
keeps running.
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.adapters.pulp.client import get_pulp_client
from app.adapters.pulp.exceptions import PulpAdapterError
from app.core.config import get_settings
from app.core.jobs.registry import job_registry
from app.modules.api_compatibility.manifest import used_endpoints
from app.modules.api_compatibility.models import ApiCompatibilityCheck

MODULE = "api_compatibility"


def check_job(db: Session, payload: dict) -> dict:
    api_base = get_settings().pulp_api_base_path
    try:
        schema = get_pulp_client().get_openapi_schema()
    except PulpAdapterError as exc:
        db.add(
            ApiCompatibilityCheck(
                checked_at=datetime.now(UTC),
                pulp_reachable=False,
                missing_endpoints=[],
                error=str(exc)[:2000],
            )
        )
        db.flush()
        return {"pulp_reachable": False, "missing_endpoints": [], "error": str(exc)}

    live_paths = set(schema.get("paths", {}).keys())
    missing = [
        suffix for suffix in used_endpoints() if f"{api_base}{suffix}" not in live_paths
    ]

    db.add(
        ApiCompatibilityCheck(
            checked_at=datetime.now(UTC),
            pulp_reachable=True,
            missing_endpoints=missing,
            error=None,
        )
    )
    db.flush()
    return {"pulp_reachable": True, "missing_endpoints": missing}


def register() -> None:
    job_registry.register("api_compatibility.check", check_job)
