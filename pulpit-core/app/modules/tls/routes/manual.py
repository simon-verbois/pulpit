"""Manual certificate upload - applied SYNCHRONOUSLY, not through
enqueue_job like every other route in this module - see manual.py's own
docstring for why."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import FullUser, require_staff_user
from app.core.database import get_db
from app.modules.tls import manual, service
from app.modules.tls.models import TlsCertSource
from app.modules.tls.schemas import ManualCertificateUploadRequest, TlsCertificateRead

router = APIRouter(prefix="/manual", dependencies=[Depends(require_staff_user)])


@router.post("", response_model=TlsCertificateRead)
def upload_manual_certificate(
    request: ManualCertificateUploadRequest,
    db: Session = Depends(get_db),
    user: FullUser = Depends(require_staff_user),
) -> TlsCertificateRead:
    try:
        parsed = manual.parse_and_validate(request.cert_pem, request.key_pem)
    except manual.InvalidCertificateError as exc:
        # 400, not FastAPI's automatic 422: the frontend's shared error
        # normalization (src/api/errors/PulpApiError.ts) only surfaces a
        # response's `detail` text for what it classifies as "validation"
        # (400, matching Pulp/DRF's own convention) - matching that here
        # means this route's specific error message reaches the admin
        # without a frontend-side special case for a lone 422.
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    cert = service.install_certificate(
        db,
        source=TlsCertSource.MANUAL,
        cert_pem=request.cert_pem,
        key_pem=request.key_pem,
        subject=parsed.subject,
        fingerprint_sha256=parsed.fingerprint_sha256,
        not_before=parsed.not_before,
        not_after=parsed.not_after,
        triggered_by="manual",
        notes=f"Uploaded by {user.username}.",
    )
    db.commit()
    return TlsCertificateRead.model_validate(cert)
