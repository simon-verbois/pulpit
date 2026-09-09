"""Per-repository signing actions. Configuration is submitted to Pulp with
the caller's credentials. Any returned task is followed by a background
job; synchronous responses are recorded as completed jobs immediately.

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

import re

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.adapters.pulp import PulpAdapterError, PulpClient
from app.core.auth import CurrentUser, FullUser, require_authenticated_user, require_staff_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job, mark_succeeded
from app.modules.signing import service
from app.modules.signing.jobs import configure_repository_signing as apply_repository_signing
from app.modules.signing.models import PulpServicePurpose, PulpServiceStatus, SigningPulpService
from app.modules.signing.schemas import RepositorySigningStatus

router = APIRouter(prefix="/repositories")


@router.get("/policy", response_model=RepositorySigningStatus)
def get_current_policy(
    db: Session = Depends(get_db),
    _user: CurrentUser = Depends(require_authenticated_user),
) -> RepositorySigningStatus:
    """What Pulpit's RPM repository create/edit form (task section 10) uses
    to pre-fill the Signing section from the current global policy, instead
    of making an administrator type a fingerprint by hand.

    `_user` (previously absent): this route had NO auth dependency at all -
    unlike its siblings below (`/configure` takes `require_authenticated_user`,
    `/apply-to-all` takes the stricter `require_staff_user`), it was
    reachable with no session/credentials whatsoever. Just needs
    authentication, not staff, like `/configure` - this only reveals the
    current global signing policy, never enqueues anything."""
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

    @field_validator("repository_href")
    @classmethod
    def valid_repository_href(cls, value: str) -> str:
        base = re.escape(get_settings().pulp_api_base_path)
        if not re.fullmatch(base + r"/repositories/rpm/rpm/[0-9a-fA-F-]{36}/", value):
            raise ValueError("Expected a relative RPM repository href")
        return value


@router.post("/configure", response_model=JobRead, status_code=202)
def configure_repository_signing(
    request: ConfigureRepositorySigningRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_authenticated_user),
) -> JobRead:
    headers = {
        name: value for name in ("cookie", "authorization", "x-csrftoken")
        if (value := http_request.headers.get(name))
    }
    # Only the caller's credentials are used for GET/PATCH. Pulp itself
    # enforces object permissions, including global and superuser roles.
    pulp = PulpClient(get_settings(), caller_headers=headers)
    try:
        result = apply_repository_signing(db, request.model_dump(), pulp)
    except PulpAdapterError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    job = enqueue_job(
        db,
        "signing.configure_repository_signing",
        result,
        requested_by=user.username,
    )
    if result["pulp_task"] is None:
        # Live Pulp can apply a field-only PATCH synchronously (200).
        # Preserve the JobRead contract without queueing nonexistent work.
        mark_succeeded(db, job, result)
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
