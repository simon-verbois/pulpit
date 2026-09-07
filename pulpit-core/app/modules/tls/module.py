"""The tls module's public surface - this is the only file
app/modules/registry.py imports from this package. Everything else here
(models, service, jobs, selfsigned, ...) is internal to the module; another
module must never import them directly."""

from fastapi import APIRouter

from app.modules.tls import jobs as tls_jobs
from app.modules.tls.routes import active, freeipa, manual, selfsigned

name = "tls"

router = APIRouter()
router.include_router(active.router)
router.include_router(selfsigned.router)
router.include_router(manual.router)
router.include_router(freeipa.router)

# (job_type, interval_seconds) - see app/modules/registry.py
# build_scheduled_jobs() and worker/main.py's generic scheduler loop.
scheduled_jobs = [("tls.renewal_check", 86400)]


def register() -> None:
    tls_jobs.register()
