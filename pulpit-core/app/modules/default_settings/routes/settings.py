from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_authenticated_user, require_staff_user
from app.core.crypto import SecretKeyNotConfigured
from app.core.database import get_db
from app.modules.default_settings import service
from app.modules.default_settings.schemas import DefaultSettingsRead, DefaultSettingsUpdate

router = APIRouter(prefix="/settings", dependencies=[Depends(require_authenticated_user)])


@router.get("", response_model=DefaultSettingsRead)
def read_settings(db: Session = Depends(get_db)) -> DefaultSettingsRead:
    row = service.get_settings_row(db)
    db.commit()
    return DefaultSettingsRead.model_validate(row)


@router.patch("", response_model=DefaultSettingsRead, dependencies=[Depends(require_staff_user)])
def patch_settings(
    changes: DefaultSettingsUpdate, db: Session = Depends(get_db)
) -> DefaultSettingsRead:
    # Staff-only: every field DefaultSettingsUpdate accepts is part of the
    # instance-wide proxy config (proxy_url/proxy_username/proxy_password/
    # proxy_tls_validation/proxy_ca_cert) - the same "affects every plugin's
    # every Remote" blast radius apply_proxy.py's staff gate exists for, so
    # this route gets the same bar even though the plain GET above (which
    # never returns the raw password - see schemas.py) stays available to
    # any authenticated user.
    row = service.get_settings_row(db)
    try:
        service.update_settings(db, row, changes.model_dump(exclude_unset=True))
    except SecretKeyNotConfigured as exc:
        # Only reachable when this request actually sets a non-empty
        # proxy_password (service.update_settings) - every other field
        # updates fine with no key configured at all.
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    db.commit()
    return DefaultSettingsRead.model_validate(row)
