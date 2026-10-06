from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_staff_user

router = APIRouter(prefix="/proxy-credentials", dependencies=[Depends(require_staff_user)])


@router.get("")
def read_proxy_credentials() -> None:
    raise HTTPException(status_code=410, detail="Proxy credentials are managed globally and are no longer returned to remote forms.")
