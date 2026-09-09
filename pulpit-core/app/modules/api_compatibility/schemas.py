from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ApiCompatibilityCheckRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    checked_at: datetime
    pulp_reachable: bool
    missing_endpoints: list[str]
    error: str | None
