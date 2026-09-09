"""api_compatibility module models - one row per check run, newest wins
(service.get_latest_check), same "newest row wins" convention as
TlsCertificate (app/modules/tls/models.py). Written exactly once per
container launch (jobs.py's check_job, enqueued once at pulpit-worker
startup - worker/main.py - never on a recurring schedule), so there is no
meaningful history to keep beyond the current/previous run; old rows are
harmless and simply ignored on read.
"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class ApiCompatibilityCheck(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "api_compatibility_checks"

    checked_at: Mapped[datetime] = mapped_column(UTCDateTime)
    pulp_reachable: Mapped[bool] = mapped_column(Boolean)
    # list[str] of used_endpoints.json entries not found in the live Pulp
    # OpenAPI schema's own paths - generic sqlalchemy.JSON (not the
    # Postgres-only JSONB), same round-trips-on-both-backends requirement
    # as every other column in this app (app/core/database/base.py).
    missing_endpoints: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Set only when the check itself couldn't run (Pulp unreachable, schema
    # fetch/parse failure) - distinct from a successful check that simply
    # found no missing endpoints (missing_endpoints == [], error is None).
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
