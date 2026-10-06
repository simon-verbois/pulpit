from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_staff_user

router = APIRouter(dependencies=[Depends(require_staff_user)])


@router.post("/apply-proxy-to-all-remotes")
def apply_proxy_to_all_remotes() -> None:
    raise HTTPException(status_code=410, detail="The global network policy applies automatically to all remotes. Save Global Proxy Settings instead.")
