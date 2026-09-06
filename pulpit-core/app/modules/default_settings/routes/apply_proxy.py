"""Staff-only: enqueues the bulk "overwrite every Remote's proxy with the
instance default" job (jobs.py) - a destructive, wide-blast-radius action
(every plugin's every Remote), unlike this module's other routes
(read/edit your own defaults), which only need authentication."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import FullUser, require_staff_user
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job
from app.modules.default_settings.jobs import JOB_TYPE

router = APIRouter(dependencies=[Depends(require_staff_user)])


@router.post("/apply-proxy-to-all-remotes", response_model=JobRead, status_code=202)
def apply_proxy_to_all_remotes(
    db: Session = Depends(get_db),
    user: FullUser = Depends(require_staff_user),
) -> JobRead:
    job = enqueue_job(db, JOB_TYPE, requested_by=user.username)
    db.commit()
    return JobRead.model_validate(job)
