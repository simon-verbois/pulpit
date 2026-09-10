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
# detect_repository_content_changes runs far more often than rotation_check
# - it's the mechanism that makes a normal sync's new RPMs get resigned
# automatically (docs/signing.md "Incremental resigning after sync") without
# waiting up to 300s, and each check is cheap (one `/repositories/rpm/rpm/`
# page-through comparing an already-indexed watermark, no per-package work
# unless something actually changed - see jobs.py
# `detect_repository_content_changes_job`).
scheduled_jobs = [
    ("signing.rotation_check", 300),
    ("signing.detect_repository_content_changes", 60),
]


def register() -> None:
    signing_jobs.register()
