import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Uuid
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """`DateTime(timezone=True)` that actually round-trips as timezone-aware
    on every backend, not just Postgres.

    BUG FOUND (against SQLite, embedded mode - docs/DEPLOYMENT.md): plain
    `DateTime(timezone=True)` comes back timezone-AWARE from Postgres
    (`TIMESTAMPTZ`, stored/returned as UTC by psycopg) but comes back
    timezone-NAIVE from SQLite, which has no real timestamp type at all -
    SQLAlchemy stores an ISO-8601-ish string and parses it back without
    reattaching tzinfo. This is the exact same naive-vs-aware bug
    `SigningKey`'s own docstring already found once for Postgres (comparing
    a naive value against `datetime.now(timezone.utc)` raises "can't compare
    offset-naive and offset-aware datetimes") - `utcnow()` above means
    every value this app ever writes is already UTC, so reattaching
    `timezone.utc` on read is always correct, never a guess.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


class Base(DeclarativeBase):
    """Shared declarative base.

    Each module owns its own tables (docs/adr/0006-pulpit-core-backend.md) -
    this base only provides the primary-key/timestamp conventions every
    table uses, never a shared "generic settings" table (task requirement:
    no giant catch-all settings table for every future module).
    """


class UUIDPrimaryKeyMixin:
    # sqlalchemy.Uuid (generic, VERIFIED round-trips real uuid.UUID objects
    # against both SQLite and Postgres - deployment/kube/, deployment/podman/, and this
    # embedded-SQLite mode all need one model layer, not per-backend forks),
    # not sqlalchemy.dialects.postgresql.UUID (Postgres-only) or the
    # confusingly-similarly-named sqlalchemy.UUID (its own docs: "will not
    # function for backends which don't have this exact-named type" -
    # SQLite doesn't). Compiles to a native `uuid` column on Postgres
    # (VERIFIED unchanged from before), and an emulated string-backed one on
    # SQLite.
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)
