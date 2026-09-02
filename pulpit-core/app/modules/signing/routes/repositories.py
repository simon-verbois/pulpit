"""Per-repository signing actions (task section 10). These only ever
enqueue a job - repository signing wiring is a Pulp API call plus a Pulp
task, never something worth blocking an HTTP request on.

Only exposes actions that are actually implemented and safe to run (task
section 10: "Only expose actions that are actually implemented and safe."):
configuring package/metadata signing on a repository going forward, and
reading current status/policy readiness. Bulk re-signing of already-synced
content is NOT exposed here - pulp_rpm's package signing is upload-time
only (docs/signing.md "Known limitations"), so there is no safe, real
"re-sign existing packages" operation to wire up yet.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, require_authenticated_user
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
