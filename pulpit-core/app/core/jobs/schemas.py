import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.core.jobs.models import JobStatus


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_type: str
    status: JobStatus
    result: dict | None
    error: str | None
    attempts: int
    scheduled_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    requested_by: str | None
    created_at: datetime
