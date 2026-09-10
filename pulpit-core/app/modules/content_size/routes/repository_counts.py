from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_authenticated_user
from app.core.database import get_db
from app.modules.content_size import service
from app.modules.content_size.schemas import ComponentRepositoryCountRead

router = APIRouter(
    prefix="/repository-counts", dependencies=[Depends(require_authenticated_user)]
)


@router.get("", response_model=list[ComponentRepositoryCountRead])
def list_repository_counts(db: Session = Depends(get_db)) -> list[ComponentRepositoryCountRead]:
    rows = service.list_repository_counts(db)
    db.commit()
    return [ComponentRepositoryCountRead.model_validate(row) for row in rows]
