from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TaskRetentionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    retention_days: int
    last_run_at: datetime | None
    last_run_error: str | None


class TaskRetentionUpdate(BaseModel):
    """PATCH semantics - a field left out is left unchanged."""

    enabled: bool | None = None
    retention_days: int | None = Field(default=None, ge=1, le=3650)
