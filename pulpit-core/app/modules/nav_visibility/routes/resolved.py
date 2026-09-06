"""The resolution endpoint every authenticated user calls for themselves
(no staff requirement here or special-casing based on `is_staff` - unlike
routes/settings.py, which gates who may CHANGE the global list, this only
ever answers "what should I, the caller, see", and the same global list
applies to every signed-in user regardless of role - see service.py's own
docstring)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, require_authenticated_user
from app.core.database import get_db
from app.modules.nav_visibility import service
from app.modules.nav_visibility.schemas import ResolvedNavVisibility

router = APIRouter()


@router.get("/me", response_model=ResolvedNavVisibility)
def read_my_visibility(
    _user: CurrentUser = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> ResolvedNavVisibility:
    visible = service.resolve_visible_modules(db)
    return ResolvedNavVisibility(visible_module_ids=visible)
