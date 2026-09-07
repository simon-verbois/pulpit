"""Staff-only: enqueues the job that pushes the currently-saved LDAP config
out to Pulp and restarts its API process to pick it up - a disruptive,
instance-wide action (every user's login goes through the restarted
process for the few seconds it takes), unlike this module's settings
routes (save your own draft), which stop short of ever touching Pulp."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import FullUser, require_staff_user
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job
from app.modules.ldap.jobs import APPLY_JOB_TYPE

router = APIRouter(dependencies=[Depends(require_staff_user)])


@router.post("/settings/apply", response_model=JobRead, status_code=202)
def apply_config(
    db: Session = Depends(get_db),
    user: FullUser = Depends(require_staff_user),
) -> JobRead:
    job = enqueue_job(db, APPLY_JOB_TYPE, requested_by=user.username)
    db.commit()
    return JobRead.model_validate(job)
