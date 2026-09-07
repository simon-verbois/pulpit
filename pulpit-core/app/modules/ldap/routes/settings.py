from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_staff_user
from app.core.crypto import SecretKeyNotConfigured
from app.core.database import get_db
from app.modules.ldap import service
from app.modules.ldap.schemas import LdapSettingsRead, LdapSettingsUpdate

# Staff-only for BOTH read and write, unlike default_settings' proxy config
# (open to any authenticated user for GET) - this is how every user on the
# instance authenticates, not a per-Remote connection detail, so even
# reading the bind DN/search bases/server URI is admin-only here.
router = APIRouter(prefix="/settings", dependencies=[Depends(require_staff_user)])


@router.get("", response_model=LdapSettingsRead)
def read_settings(db: Session = Depends(get_db)) -> LdapSettingsRead:
    row = service.get_settings_row(db)
    db.commit()
    return LdapSettingsRead.model_validate(row)


@router.patch("", response_model=LdapSettingsRead)
def patch_settings(
    changes: LdapSettingsUpdate, db: Session = Depends(get_db)
) -> LdapSettingsRead:
    row = service.get_settings_row(db)
    try:
        service.update_settings(db, row, changes.model_dump(exclude_unset=True))
    except SecretKeyNotConfigured as exc:
        # Only reachable when this request actually sets a non-empty
        # bind_password (service.update_settings) - every other field
        # updates fine with no key configured at all.
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    db.commit()
    return LdapSettingsRead.model_validate(row)
