from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.fixture_seed.models import FixtureSeedState


def has_seeded(db: Session) -> bool:
    return db.execute(select(FixtureSeedState.id).limit(1)).first() is not None


def mark_seeded(db: Session) -> None:
    db.add(FixtureSeedState())
    db.flush()
