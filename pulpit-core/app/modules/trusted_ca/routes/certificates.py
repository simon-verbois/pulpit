import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, require_authenticated_user
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job
from app.modules.trusted_ca import service
from app.modules.trusted_ca.schemas import TrustedCaCertificateCreate, TrustedCaCertificateRead

router = APIRouter(prefix="/certificates", dependencies=[Depends(require_authenticated_user)])


@router.get("", response_model=list[TrustedCaCertificateRead])
def list_certificates(db: Session = Depends(get_db)) -> list[TrustedCaCertificateRead]:
    rows = service.list_certificates(db)
    db.commit()
    return [TrustedCaCertificateRead.model_validate(row) for row in rows]


@router.post("", response_model=JobRead, status_code=202)
def create_certificate(
    data: TrustedCaCertificateCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_authenticated_user),
) -> JobRead:
    """Returns the queued sync Job (task section 12: never runs the actual
    docker-exec/update-ca-trust call inline) - same pattern as signing's key
    generation. The frontend polls it with useJob and refetches the
    certificate list once it settles (RemoteConnectionSettingsFields.tsx's
    sibling in Default Settings)."""
    if service.get_certificate_by_name(db, data.name) is not None:
        raise HTTPException(
            status_code=409, detail=f"A CA certificate named {data.name!r} already exists."
        )
    service.create_certificate(db, name=data.name, pem=data.pem)
    job = enqueue_job(db, "trusted_ca.sync", requested_by=user.username)
    db.commit()
    return JobRead.model_validate(job)


@router.delete("/{certificate_id}", status_code=204)
def delete_certificate(
    certificate_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_authenticated_user),
) -> None:
    row = service.get_certificate(db, certificate_id)
    if row is None:
        raise HTTPException(status_code=404, detail="CA certificate not found")
    service.delete_certificate(db, row)
    enqueue_job(db, "trusted_ca.sync", requested_by=user.username)
    db.commit()
