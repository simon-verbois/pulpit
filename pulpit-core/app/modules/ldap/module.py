"""ldap module's public surface - the only file app/modules/registry.py
imports from this package (same seam as default_settings/signing - see
app/modules/signing/module.py). No routes have any user-facing effect
until "Apply" is clicked (routes/apply.py) - saving settings alone
(routes/settings.py) never reaches Pulp."""

from fastapi import APIRouter

from app.modules.ldap import jobs as ldap_jobs
from app.modules.ldap.routes.apply import router as apply_router
from app.modules.ldap.routes.settings import router as settings_router
from app.modules.ldap.routes.test_connection import router as test_connection_router

name = "ldap"

router = APIRouter()
router.include_router(settings_router)
router.include_router(apply_router)
router.include_router(test_connection_router)


def register() -> None:
    ldap_jobs.register()
