from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter()


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    """Unauthenticated liveness/readiness probe for Compose healthchecks -
    deliberately reveals nothing about signing state (no key/version info,
    task section 15 "avoid leaking ... in diagnostics")."""
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
