"""content_size module's public surface - the only file
app/modules/registry.py imports from this package (same seam as signing;
see app/modules/signing/module.py)."""

from fastapi import APIRouter

from app.modules.content_size import jobs as content_size_jobs
from app.modules.content_size.routes.repository_counts import (
    router as repository_counts_router,
)
from app.modules.content_size.routes.repository_sizes import router as repository_sizes_router
from app.modules.content_size.routes.sizes import router as sizes_router

name = "content_size"

router = APIRouter()
router.include_router(sizes_router)
router.include_router(repository_sizes_router)
router.include_router(repository_counts_router)

# (job_type, interval_seconds) - collected by app/modules/registry.py's
# build_scheduled_jobs() and driven by worker/main.py's generic scheduler
# loop (same mechanism signing's rotation_check already used, generalized
# here to a second module - see worker/main.py). Sizes stay hourly - the
# expensive full artifact+content scan. Repository counts refresh far more
# often since that job only pages `/repositories/`, no artifact/content
# lookups.
scheduled_jobs = [
    ("content_size.refresh", 3600),
    ("content_size.refresh_repository_counts", 300),
]


def register() -> None:
    content_size_jobs.register()
