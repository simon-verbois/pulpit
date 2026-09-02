"""The signing module's public surface - this is the only file
app/modules/registry.py imports from this package. Everything else here
(models, service, jobs, key_manager, ...) is internal to the module; another
module must never import them directly (task section 1: "Do not let one
feature directly depend on another feature's internals")."""

from fastapi import APIRouter

from app.modules.signing import jobs as signing_jobs
from app.modules.signing.routes import keys, public_key, repositories, settings

name = "signing"

router = APIRouter()
router.include_router(settings.router)
router.include_router(keys.router)
router.include_router(repositories.router)

# Opt-in, unauthenticated, unprefixed (see app/modules/registry.py
# build_public_router) - DNF/rpm clients fetch this directly, they don't
# authenticate to Pulpit at all.
public_router = public_key.router

# (job_type, interval_seconds) - see app/modules/registry.py
# build_scheduled_jobs() and worker/main.py's generic scheduler loop.
scheduled_jobs = [("signing.rotation_check", 300)]


def register() -> None:
    signing_jobs.register()
