from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ComponentContentSizeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    component: str
    size_bytes: int
    updated_at: datetime


class RepositoryContentSizeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    repository_href: str
    size_bytes: int
    updated_at: datetime


class ComponentRepositoryCountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    component: str
    count: int
    updated_at: datetime
