from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_authenticated_user
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


@router.patch("", response_model=DefaultSettingsRead)
def patch_settings(
    changes: DefaultSettingsUpdate, db: Session = Depends(get_db)
) -> DefaultSettingsRead:
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
