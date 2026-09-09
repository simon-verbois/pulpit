from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_authenticated_user, require_staff_user
from app.core.database import get_db
from app.modules.signing import service
from app.modules.signing.schemas import SigningSettingsRead, SigningSettingsUpdate

router = APIRouter(prefix="/settings", dependencies=[Depends(require_authenticated_user)])


@router.get("", response_model=SigningSettingsRead)
def read_settings(db: Session = Depends(get_db)) -> SigningSettingsRead:
    row = service.get_settings_row(db)
    db.commit()
    return SigningSettingsRead.model_validate(row)


@router.patch("", response_model=SigningSettingsRead, dependencies=[Depends(require_staff_user)])
def patch_settings(
    changes: SigningSettingsUpdate, db: Session = Depends(get_db)
) -> SigningSettingsRead:
    row = service.get_settings_row(db)
    service.update_settings(db, row, changes.model_dump(exclude_unset=True))
    db.commit()
    return SigningSettingsRead.model_validate(row)
