"""Staff-only: purging deletes audit history, so even reading is limited."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import FullUser, require_staff_user
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job
from app.modules.task_retention import service
from app.modules.task_retention.jobs import PURGE_JOB_TYPE
from app.modules.task_retention.schemas import TaskRetentionRead, TaskRetentionUpdate

router = APIRouter(dependencies=[Depends(require_staff_user)])


@router.get("/settings", response_model=TaskRetentionRead)
def read_settings(db: Session = Depends(get_db)) -> TaskRetentionRead:
    row = service.get_settings_row(db)
    db.commit()
    return TaskRetentionRead.model_validate(row)


@router.patch("/settings", response_model=TaskRetentionRead)
def patch_settings(
    changes: TaskRetentionUpdate, db: Session = Depends(get_db)
) -> TaskRetentionRead:
    row = service.get_settings_row(db)
    service.update_settings(db, row, changes.model_dump(exclude_unset=True))
    db.commit()
    return TaskRetentionRead.model_validate(row)


@router.post("/purge", response_model=JobRead, status_code=202)
def purge_now(
    db: Session = Depends(get_db),
    user: FullUser = Depends(require_staff_user),
) -> JobRead:
    job = enqueue_job(db, PURGE_JOB_TYPE, {"manual": True}, requested_by=user.username)
    db.commit()
    return JobRead.model_validate(job)
