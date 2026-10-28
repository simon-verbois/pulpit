from datetime import datetime

from sqlalchemy import Boolean, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin

DEFAULT_RETENTION_DAYS = 90


class TaskRetentionSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Singleton: how long Pulp keeps its finished task history.

    Pulp never deletes tasks by itself, so the table grows without bound
    (a busy instance accumulates tens of thousands of orphan-cleanup and
    analytics tasks). The daily `task_retention.purge` job asks Pulp to
    purge every finished task older than `retention_days`.
    """

    __tablename__ = "task_retention_settings"

    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    retention_days: Mapped[int] = mapped_column(Integer, default=DEFAULT_RETENTION_DAYS)
    last_run_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    last_run_error: Mapped[str | None] = mapped_column(Text, nullable=True)
