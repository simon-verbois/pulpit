from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_staff_user
from app.core.config import get_settings
from app.core.database import get_db
from app.modules.tls import service
from app.modules.tls.schemas import (
    TlsActiveCertificateRead,
    TlsCertificateHistoryRead,
    TlsCertificateRead,
)

router = APIRouter(dependencies=[Depends(require_staff_user)])


@router.get("/active", response_model=TlsActiveCertificateRead)
def get_active_certificate(db: Session = Depends(get_db)) -> TlsActiveCertificateRead:
    cert = service.get_active_certificate(db)
    if cert is None:
        raise HTTPException(status_code=404, detail="No TLS certificate installed yet")
    db.commit()
    warn_days = get_settings().tls_warn_days
    days_left = service.days_until(cert.not_after)
    base = TlsCertificateRead.model_validate(cert)
    return TlsActiveCertificateRead(
        **base.model_dump(),
        days_until_expiry=days_left,
        warn_days=warn_days,
        is_expiring_soon=days_left <= warn_days,
    )


@router.get("/history", response_model=list[TlsCertificateHistoryRead])
def get_history(db: Session = Depends(get_db)) -> list[TlsCertificateHistoryRead]:
    rows = service.list_history(db)
    db.commit()
    return [TlsCertificateHistoryRead.model_validate(row) for row in rows]
