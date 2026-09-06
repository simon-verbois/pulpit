"""Admin management of the global nav-visibility allow-list. Staff-only to
CHANGE (`require_staff_user` - the first admin-only gate in pulpit-core,
see app/core/auth.py's own docstring on why `is_staff` rather than
`is_superuser`) - this only gates who may edit the list, not who it
applies to: once saved, it restricts every signed-in user equally,
including the staff account that just changed it (routes/resolved.py has
no staff special-casing at all - see service.py's own docstring)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_staff_user
from app.core.database import get_db
from app.modules.nav_visibility import service
from app.modules.nav_visibility.schemas import (
    NavVisibilitySettingsRead,
    NavVisibilitySettingsUpdate,
)

router = APIRouter(prefix="/settings", dependencies=[Depends(require_staff_user)])


@router.get("", response_model=NavVisibilitySettingsRead)
def read_settings(db: Session = Depends(get_db)) -> NavVisibilitySettingsRead:
    return NavVisibilitySettingsRead(visible_module_ids=service.get_visible_modules(db))


@router.put("", response_model=NavVisibilitySettingsRead)
def update_settings(
    changes: NavVisibilitySettingsUpdate, db: Session = Depends(get_db)
) -> NavVisibilitySettingsRead:
    service.set_visible_modules(db, changes.visible_module_ids)
    db.commit()
    # Re-read rather than echo the request body back - reflects what was
    # actually stored (e.g. de-duplicated), not just what was sent.
    return NavVisibilitySettingsRead(visible_module_ids=service.get_visible_modules(db))
