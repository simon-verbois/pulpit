from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class EventLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Durable, append-only record of events published on the event bus.

    This is an audit trail, not a message broker - see app/core/events/bus.py
    docstring for why an in-process bus (with this table as its durability/
    observability layer) is enough for pulpit-core's first modules, and what
    would need to change to grow into one.
    """

    __tablename__ = "events_log"

    event_type: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    source_module: Mapped[str] = mapped_column(String(64), nullable=False)
