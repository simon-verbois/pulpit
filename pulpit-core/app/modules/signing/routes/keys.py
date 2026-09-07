import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, require_authenticated_user
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job, get_job
from app.modules.signing import service
from app.modules.signing.models import KeyState, PulpServiceStatus, SigningPulpService
from app.modules.signing.schemas import (
    ExtendExpirationRequest,
    GenerateKeyRequest,
    PublishKeyRequest,
    SigningKeyRead,
)

router = APIRouter(prefix="/keys", dependencies=[Depends(require_authenticated_user)])


def _to_read(key, filename: str) -> SigningKeyRead:
    data = SigningKeyRead.model_validate(key)
    data.public_key_url = service.public_key_url(key, filename)
    return data


@router.get("", response_model=list[SigningKeyRead])
def list_keys(state: KeyState | None = None, db: Session = Depends(get_db)) -> list[SigningKeyRead]:
    settings_row = service.get_settings_row(db)
    keys = service.list_keys(db, state=state)
    db.commit()
    return [_to_read(key, settings_row.public_key_filename) for key in keys]


@router.get("/{key_id}", response_model=SigningKeyRead)
def get_key(key_id: uuid.UUID, db: Session = Depends(get_db)) -> SigningKeyRead:
    settings_row = service.get_settings_row(db)
    key = service.get_key(db, key_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Signing key not found")
    db.commit()
    return _to_read(key, settings_row.public_key_filename)


@router.get("/{key_id}/pulp-services")
def get_key_pulp_services(key_id: uuid.UUID, db: Session = Depends(get_db)) -> list[dict]:
    """Surfaces PENDING_MANUAL_SETUP rows (with the exact command to run) so
    the GUI can show "waiting on: run this on the Pulp host" (task section
    11: "Use appropriate confirmations ...")."""
    rows = db.query(SigningPulpService).filter(SigningPulpService.signing_key_id == key_id).all()
    db.commit()
    return [
        {
            "purpose": row.purpose,
            "status": row.status,
            "name": row.name,
            "pulp_href": row.pulp_href,
            "bootstrap_command": row.bootstrap_command if row.status == PulpServiceStatus.PENDING_MANUAL_SETUP else None,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.post("/generate", response_model=JobRead, status_code=202)
def generate_key(
    request: GenerateKeyRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_authenticated_user),
) -> JobRead:
    job = enqueue_job(
        db,
        "signing.generate_key",
        {
            "validity_days": request.validity_days,
            "no_expiration": request.no_expiration,
            "triggered_by": "manual",
        },
        requested_by=user.username,
    )
    db.commit()
    return JobRead.model_validate(job)


@router.post("/{key_id}/publish", response_model=JobRead, status_code=202)
def publish_key(
    key_id: uuid.UUID,
    request: PublishKeyRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_authenticated_user),
) -> JobRead:
    """Publishes an already-generated NEXT key as THE single active signing
    key immediately, bypassing the scheduled activation threshold (task
    section 11). Also schedules mandatory resigning/republishing of every
    affected repository's existing content - see
    app/modules/signing/jobs.py's publish_key_job docstring."""
    key = service.get_key(db, key_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Signing key not found")
    if key.state != KeyState.NEXT:
        raise HTTPException(status_code=409, detail="Only a NEXT key can be published")
    job = enqueue_job(
        db,
        "signing.publish_key",
        {"key_id": str(key_id), "triggered_by": "manual", "reason": request.reason},
        requested_by=user.username,
    )
    db.commit()
    return JobRead.model_validate(job)


@router.post("/{key_id}/extend-expiration", response_model=JobRead, status_code=202)
def extend_expiration(
    key_id: uuid.UUID,
    request: ExtendExpirationRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_authenticated_user),
) -> JobRead:
    key = service.get_key(db, key_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Signing key not found")
    job = enqueue_job(
        db,
        "signing.extend_expiration",
        {"key_id": str(key_id), "new_validity_days": request.additional_days},
        requested_by=user.username,
    )
    db.commit()
    return JobRead.model_validate(job)


@router.get("/jobs/{job_id}", response_model=JobRead)
def get_key_job(job_id: uuid.UUID, db: Session = Depends(get_db)) -> JobRead:
    job = get_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobRead.model_validate(job)
