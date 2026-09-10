from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_authenticated_user
from app.core.database import get_db
from app.modules.content_size import service
from app.modules.content_size.schemas import RepositoryContentSizeRead

router = APIRouter(
    prefix="/repository-sizes", dependencies=[Depends(require_authenticated_user)]
)


@router.get("", response_model=list[RepositoryContentSizeRead])
def list_repository_sizes(db: Session = Depends(get_db)) -> list[RepositoryContentSizeRead]:
    rows = service.list_repository_sizes(db)
    db.commit()
    return [RepositoryContentSizeRead.model_validate(row) for row in rows]
