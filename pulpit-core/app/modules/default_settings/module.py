"""default_settings module's public surface - the only file
app/modules/registry.py imports from this package (same seam as signing and
signing; see app/modules/signing/module.py)."""

from fastapi import APIRouter

from app.modules.default_settings import jobs as default_settings_jobs
from app.modules.default_settings.routes.apply_proxy import (
    router as apply_proxy_router,
)
from app.modules.default_settings.routes.proxy_credentials import (
    router as proxy_credentials_router,
)
from app.modules.default_settings.routes.settings import router as settings_router

name = "default_settings"

router = APIRouter()
router.include_router(settings_router)
router.include_router(proxy_credentials_router)
router.include_router(apply_proxy_router)


def register() -> None:
    default_settings_jobs.register()
