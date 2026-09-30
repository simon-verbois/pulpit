import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import FullUser, get_full_user, require_authenticated_user
from app.core.database import get_db
from app.core.jobs.models import Job, JobStatus
from app.core.jobs.schemas import JobPage, JobRead
from app.core.jobs.service import get_job

router = APIRouter(prefix="/jobs", tags=["jobs"], dependencies=[Depends(require_authenticated_user)])


def _scheduled_job_types() -> set[str]:
    # Imported lazily: app.modules.registry imports every module, some of
    # which import app.core.jobs - a top-level import here would be circular.
    from app.modules.registry import build_scheduled_jobs

    return {job_type for job_type, _interval in build_scheduled_jobs()}


@router.get("", response_model=JobPage)
def list_jobs(
    db: Session = Depends(get_db),
    user: FullUser = Depends(get_full_user),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: list[JobStatus] | None = Query(None),
    include_scheduled: bool = False,
) -> JobPage:
    """Job history for the Tasks page, newest first - the pulpit-core
    analogue of Pulp's own task list.

    Staff see every job; anyone else only the ones they requested
    themselves (system-enqueued jobs have no `requested_by`, so they are
    staff-only). The periodic heartbeat jobs (`scheduled_jobs` in each
    module - e.g. the 60s post-sync detector) are left out unless
    `include_scheduled` is set: they'd bury everything else in the list."""
    stmt = select(Job)
    if not user.is_staff:
        stmt = stmt.where(Job.requested_by == user.username)
    if status:
        stmt = stmt.where(Job.status.in_(status))
    if not include_scheduled:
        stmt = stmt.where(Job.job_type.not_in(_scheduled_job_types()))
    count = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    jobs = db.execute(
        stmt.order_by(Job.created_at.desc(), Job.id.desc()).limit(limit).offset(offset)
    ).scalars()
    return JobPage(count=count, results=[JobRead.model_validate(job) for job in jobs])


@router.get("/{job_id}", response_model=JobRead)
def read_job(job_id: uuid.UUID, db: Session = Depends(get_db)) -> JobRead:
    """Generic job status polling, usable by any module's async actions -
    the frontend's task-tracking pattern (src/api/tasks/) for Pulp tasks has
    a direct analogue here for pulpit-core jobs."""
    job = get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobRead.model_validate(job)
