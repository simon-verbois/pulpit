import enum
from datetime import datetime

from sqlalchemy import JSON, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class Job(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Generic, module-agnostic unit of async work.

    A module (e.g. signing) never runs long work inline in an HTTP request -
    it enqueues a Job here and registers a handler for its `job_type` (see
    app/core/jobs/registry.py). Core knows nothing about what any job_type
    means; this keeps the job system reusable by every future module without
    coupling it to signing specifically.
    """

    __tablename__ = "jobs"
    __table_args__ = (Index("ix_jobs_status_scheduled_at", "status", "scheduled_at"),)

    # Namespaced by module, e.g. "signing.generate_key" - lets many modules
    # share one table without name collisions or cross-module coupling.
    job_type: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        String(16), nullable=False, default=JobStatus.QUEUED
    )
    # Generic JSON, not Postgres-only JSONB - VERIFIED no JSONB-specific
    # query features used anywhere on these columns, portable to SQLite
    # (embedded mode, see docs/DEPLOYMENT.md).
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(nullable=True)
    attempts: Mapped[int] = mapped_column(default=0)
    max_attempts: Mapped[int] = mapped_column(default=3)
    # `timezone=True` on all three - see app/modules/signing/models.py's
    # SigningKey docstring for the naive-vs-aware bug this avoids; not yet
    # observed here (query *filters* on these compare in SQL, not Python -
    # see claim_next_job), but fixed for the same reason and consistency.
    scheduled_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    # Free-text label of who/what requested it (a Pulp username, or
    # "scheduler" for automatic rotation checks) - audit trail only, not an
    # identity/auth mechanism.
    requested_by: Mapped[str | None] = mapped_column(String(150), nullable=True)

    @property
    def repository_href(self) -> str | None:
        """The one Pulp repository this job acts on, when it has one - lifted
        out of `payload` (never exposed by the API: it can carry arbitrary
        module input) so the Tasks page can say which repository a job
        concerns."""
        value = (self.payload or {}).get("repository_href")
        return value if isinstance(value, str) else None
