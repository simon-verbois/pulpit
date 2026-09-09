"""api_compatibility module's public surface - the only file
app/modules/registry.py imports from this package (same seam as every
other module).

Deliberately no `scheduled_jobs` here (contrast tls/module.py,
signing/module.py) - this check is meant to run exactly once per
container launch, enqueued directly by pulpit-worker's own startup
sequence (worker/main.py), never on registry.py's recurring-heartbeat
path."""

from fastapi import APIRouter

from app.modules.api_compatibility import jobs as api_compatibility_jobs
from app.modules.api_compatibility.routes.status import router as status_router

name = "api_compatibility"

router = APIRouter()
router.include_router(status_router)


def register() -> None:
    api_compatibility_jobs.register()
