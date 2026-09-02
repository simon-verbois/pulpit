import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_authenticated_user
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import get_job

router = APIRouter(prefix="/jobs", tags=["jobs"], dependencies=[Depends(require_authenticated_user)])


@router.get("/{job_id}", response_model=JobRead)
def read_job(job_id: uuid.UUID, db: Session = Depends(get_db)) -> JobRead:
    """Generic job status polling, usable by any module's async actions -
    the frontend's task-tracking pattern (src/api/tasks/) for Pulp tasks has
    a direct analogue here for pulpit-core jobs."""
    job = get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobRead.model_validate(job)
