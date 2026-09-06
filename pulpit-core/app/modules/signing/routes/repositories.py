"""Per-repository signing actions (task section 10). These only ever
enqueue a job - repository signing wiring is a Pulp API call plus a Pulp
task, never something worth blocking an HTTP request on.

Signing is fully automatic per repository (no per-repository opt-in
exposed in the UI): a repository's own create/edit form no longer offers a
choice, it just applies whatever the current global policy is. `/configure`
below is the mechanism that already existed for exactly this (previously
unused by the UI); `/apply-to-all` is the bulk sweep that brings every
EXISTING repository (created before signing was turned on, or before this
policy existed) into line on demand - it also enqueues real re-signing of
already-synced package content where needed (`signing.
resign_repository_packages`, jobs.py), not just a future-uploads-only field
change.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, FullUser, require_authenticated_user, require_staff_user
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job
from app.modules.signing import service
from app.modules.signing.models import PulpServicePurpose, PulpServiceStatus, SigningPulpService
from app.modules.signing.schemas import RepositorySigningStatus

router = APIRouter(prefix="/repositories")


@router.get("/policy", response_model=RepositorySigningStatus)
def get_current_policy(db: Session = Depends(get_db)) -> RepositorySigningStatus:
    """What Pulpit's RPM repository create/edit form (task section 10) uses
    to pre-fill the Signing section from the current global policy, instead
    of making an administrator type a fingerprint by hand."""
    settings_row = service.get_settings_row(db)
    active_key = service.get_active_key(db)

    package_row = (
        db.query(SigningPulpService)
        .filter(SigningPulpService.purpose == PulpServicePurpose.PACKAGE)
        .filter(SigningPulpService.status == PulpServiceStatus.ACTIVE)
        .first()
    )
    metadata_row = None
    if active_key is not None:
        metadata_row = (
            db.query(SigningPulpService)
            .filter(SigningPulpService.purpose == PulpServicePurpose.METADATA)
            .filter(SigningPulpService.signing_key_id == active_key.id)
            .filter(SigningPulpService.status == PulpServiceStatus.ACTIVE)
            .first()
        )
    db.commit()

    return RepositorySigningStatus(
        package_signing_enabled=bool(settings_row.package_signing_enabled and package_row),
        metadata_signing_enabled=bool(settings_row.metadata_signing_enabled and metadata_row),
        package_signing_service=package_row.pulp_href if package_row else None,
        package_signing_fingerprint=active_key.fingerprint if active_key and package_row else None,
        metadata_signing_service=metadata_row.pulp_href if metadata_row else None,
    )


class ConfigureRepositorySigningRequest(BaseModel):
    repository_href: str
    sign_packages: bool | None = None
    sign_metadata: bool | None = None


@router.post("/configure", response_model=JobRead, status_code=202)
def configure_repository_signing(
    request: ConfigureRepositorySigningRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_authenticated_user),
) -> JobRead:
    job = enqueue_job(
        db,
        "signing.configure_repository_signing",
        request.model_dump(),
        requested_by=user.username,
    )
    db.commit()
    return JobRead.model_validate(job)


@router.post("/apply-to-all", response_model=JobRead, status_code=202)
def apply_signing_to_all_repositories(
    db: Session = Depends(get_db),
    user: FullUser = Depends(require_staff_user),
) -> JobRead:
    """Staff-only (unlike /configure above) - this can trigger real,
    content-rewriting re-signing work across every RPM repository on the
    instance, not a single-repository field change."""
    job = enqueue_job(
        db,
        "signing.apply_signing_to_all_repositories",
        {},
        requested_by=user.username,
    )
    db.commit()
    return JobRead.model_validate(job)
