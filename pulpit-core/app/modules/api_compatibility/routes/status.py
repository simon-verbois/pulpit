"""Read-only: reports the result of the one startup compatibility check
(jobs.check_job). Not staff-gated - unlike tls/routes/active.py, this is
diagnostic info relevant to any signed-in user viewing the Overview page
(same "every authenticated user" precedent as
nav_visibility/routes/resolved.py's `/me`), not a setting anyone can
change here."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, require_authenticated_user
from app.core.database import get_db
from app.modules.api_compatibility import service
from app.modules.api_compatibility.schemas import ApiCompatibilityCheckRead

router = APIRouter()


@router.get("/latest", response_model=ApiCompatibilityCheckRead)
def get_latest_check(
    _user: CurrentUser = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> ApiCompatibilityCheckRead:
    check = service.get_latest_check(db)
    if check is None:
        # Nothing to report yet - e.g. right after a fresh deploy, before
        # pulpit-worker's own startup check has finished. Not an error: the
        # frontend treats this the same as "no issues detected".
        raise HTTPException(status_code=404, detail="No compatibility check has run yet")
    db.commit()
    return ApiCompatibilityCheckRead.model_validate(check)
