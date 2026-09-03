"""default_settings module's public surface - the only file
app/modules/registry.py imports from this package (same seam as signing and
content_size; see app/modules/signing/module.py)."""

from fastapi import APIRouter

from app.modules.default_settings.routes.proxy_credentials import (
    router as proxy_credentials_router,
)
from app.modules.default_settings.routes.settings import router as settings_router

name = "default_settings"

router = APIRouter()
router.include_router(settings_router)
router.include_router(proxy_credentials_router)


def register() -> None:
    """No job handlers or event subscriptions of its own (yet) - required by
    the module contract regardless (app/modules/registry.py's register_all
    calls this unconditionally for every module)."""
