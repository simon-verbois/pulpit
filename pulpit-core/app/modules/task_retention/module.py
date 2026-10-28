"""task_retention module's public surface - the only file
app/modules/registry.py imports from this package."""

from fastapi import APIRouter

from app.modules.task_retention import jobs as task_retention_jobs
from app.modules.task_retention.routes.settings import router as settings_router

name = "task_retention"

router = APIRouter()
router.include_router(settings_router)

# (job_type, interval_seconds) - see app/modules/registry.py
scheduled_jobs = [(task_retention_jobs.PURGE_JOB_TYPE, 86400)]


def register() -> None:
    task_retention_jobs.register()
