from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_authenticated_user
from app.core.database import get_db
from app.modules.content_size import service
from app.modules.content_size.schemas import ComponentContentSizeRead

router = APIRouter(prefix="/sizes", dependencies=[Depends(require_authenticated_user)])


@router.get("", response_model=list[ComponentContentSizeRead])
def list_sizes(db: Session = Depends(get_db)) -> list[ComponentContentSizeRead]:
    rows = service.list_content_sizes(db)
    db.commit()
    return [ComponentContentSizeRead.model_validate(row) for row in rows]
