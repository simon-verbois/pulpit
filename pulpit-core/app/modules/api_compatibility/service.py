from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.api_compatibility.models import ApiCompatibilityCheck


def get_latest_check(db: Session) -> ApiCompatibilityCheck | None:
    return (
        db.execute(
            select(ApiCompatibilityCheck).order_by(
                ApiCompatibilityCheck.created_at.desc()
            )
        )
        .scalars()
        .first()
    )
