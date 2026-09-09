"""nav_visibility module's public surface - the only file
app/modules/registry.py imports from this package (same seam as signing,
signing and default_settings)."""

from fastapi import APIRouter

from app.modules.nav_visibility.routes.resolved import router as resolved_router
from app.modules.nav_visibility.routes.settings import router as settings_router

name = "nav_visibility"

router = APIRouter()
router.include_router(settings_router)
router.include_router(resolved_router)


def register() -> None:
    """No job handlers or event subscriptions of its own - required by the
    module contract regardless (app/modules/registry.py's register_all
    calls this unconditionally for every module)."""
