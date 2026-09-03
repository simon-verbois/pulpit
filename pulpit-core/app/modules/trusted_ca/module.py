"""trusted_ca module's public surface - the only file
app/modules/registry.py imports from this package (same seam as signing and
content_size; see app/modules/signing/module.py)."""

from fastapi import APIRouter

from app.modules.trusted_ca import jobs as trusted_ca_jobs
from app.modules.trusted_ca.routes.certificates import router as certificates_router

name = "trusted_ca"

router = APIRouter()
router.include_router(certificates_router)

# Safety-net reconcile (app/modules/registry.py's build_scheduled_jobs,
# driven by worker/main.py's generic scheduler loop) - covers a sync that
# failed transiently, or an executor that only became configured after
# some certificates were already added while it wasn't. A shorter interval
# than content_size.refresh's hourly one: this is security-relevant (a
# still-untrusted proxy fails syncs outright) and each run is cheap (one
# docker exec), not a paginated scan of Pulp's own content.
scheduled_jobs = [("trusted_ca.sync", 300)]


def register() -> None:
    trusted_ca_jobs.register()
