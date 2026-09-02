"""Signing module business logic - settings and key read paths used by the
API routes. Anything that touches GPG or Pulp signing-service creation is a
job (jobs.py), never called synchronously from a request handler (task
section 12: "Long-running work must be asynchronous")."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.signing.models import KeyState, SigningKey, SigningSettings


def get_settings_row(db: Session) -> SigningSettings:
    """Returns the singleton settings row, creating it (with config-supplied
    defaults) on first access. Every default here is overridable at runtime
    through the API/GUI - task section 3: "THIS IS ONLY A DEFAULT.""" ""
    row = db.execute(select(SigningSettings).order_by(SigningSettings.created_at)).scalars().first()
    if row is None:
        row = SigningSettings()
        db.add(row)
        db.flush()
    return row


def update_settings(db: Session, row: SigningSettings, changes: dict) -> SigningSettings:
    for field, value in changes.items():
        if value is not None:
            setattr(row, field, value)
    db.flush()
    return row


def list_keys(db: Session, *, state: KeyState | None = None) -> list[SigningKey]:
    stmt = select(SigningKey).order_by(SigningKey.created_at.desc())
    if state is not None:
        stmt = stmt.where(SigningKey.state == state)
    return list(db.execute(stmt).scalars())


def get_key(db: Session, key_id) -> SigningKey | None:
    return db.get(SigningKey, key_id)


def get_active_key(db: Session) -> SigningKey | None:
    return db.execute(
        select(SigningKey).where(SigningKey.state == KeyState.ACTIVE)
    ).scalars().first()


def get_next_key(db: Session) -> SigningKey | None:
    return db.execute(select(SigningKey).where(SigningKey.state == KeyState.NEXT)).scalars().first()


def public_key_url(key: SigningKey, filename: str) -> str:
    prefix = get_settings().public_key_url_prefix.rstrip("/")
    return f"{prefix}/{filename}"


def days_until(dt: datetime | None) -> int | None:
    if dt is None:
        return None
    delta = dt - datetime.now(timezone.utc)
    return delta.days
