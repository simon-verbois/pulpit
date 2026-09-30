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
from app.core.jobs.models import JobStatus
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job, find_matching_pending_job, mark_succeeded
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
    return _current_policy(db)


def _current_policy(db: Session) -> RepositorySigningStatus:
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


def _valid_rpm_repository_href(value: str) -> str:
    base = re.escape(get_settings().pulp_api_base_path)
    if not re.fullmatch(base + r"/repositories/rpm/rpm/[0-9a-fA-F-]{36}/", value):
        raise ValueError("Expected a relative RPM repository href")
    return value


class ConfigureRepositorySigningRequest(BaseModel):
    repository_href: str
    sign_packages: bool | None = None
    sign_metadata: bool | None = None

    _valid_repository_href = field_validator("repository_href")(_valid_rpm_repository_href)


def _caller_pulp_client(http_request: Request) -> PulpClient:
    headers = {
        name: value for name in ("cookie", "authorization", "x-csrftoken")
        if (value := http_request.headers.get(name))
    }
    return PulpClient(get_settings(), caller_headers=headers)


@router.post("/configure", response_model=JobRead, status_code=202)
def configure_repository_signing(
    request: ConfigureRepositorySigningRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_authenticated_user),
) -> JobRead:
    # Only the caller's credentials are used for GET/PATCH. Pulp itself
    # enforces object permissions, including global and superuser roles.
    pulp = _caller_pulp_client(http_request)
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


class ResignRepositoryRequest(BaseModel):
    repository_href: str

    _valid_repository_href = field_validator("repository_href")(_valid_rpm_repository_href)


@router.post("/resign", response_model=JobRead, status_code=202)
def resign_repository(
    request: ResignRepositoryRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_authenticated_user),
) -> JobRead:
    """The per-repository "Re-sign" action: makes sure one repository is
    fully under the current signing policy - both its Pulp signing fields
    and every package already in it - for when the automatic paths
    (post-sync detection, key publish, apply-to-all) didn't get it there.

    Authorization mirrors `/configure`, not `/apply-to-all`: the policy is
    first re-applied to the repository with the caller's OWN credentials, so
    Pulp's object permissions decide whether this user may change this
    repository at all - the (worker-credentialed) resign job is only queued
    once that PATCH has been accepted. The job is then a full pass (no
    `since_version`), ignoring the sync-state watermark: every package in
    the latest version is checked against the active fingerprint, and
    whatever isn't signed with it gets resigned."""
    policy = _current_policy(db)
    if not (policy.package_signing_enabled or policy.metadata_signing_enabled):
        raise HTTPException(status_code=409, detail="Repository signing is not enabled")

    href = request.repository_href
    pulp = _caller_pulp_client(http_request)
    try:
        configured = apply_repository_signing(
            db,
            {
                "repository_href": href,
                "sign_packages": policy.package_signing_enabled or None,
                "sign_metadata": policy.metadata_signing_enabled or None,
            },
            pulp,
        )
    except PulpAdapterError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    configure_task = configured["pulp_task"]
    if policy.package_signing_enabled and policy.package_signing_fingerprint:
        job_type = "signing.resign_repository_packages"
        payload: dict = {"repository_href": href, "fingerprint": policy.package_signing_fingerprint}
        existing = find_matching_pending_job(db, job_type, payload_subset=payload)
        if existing is not None:
            # Same dedup as `_enqueue_resign_job` (jobs.py). A still-queued
            # incremental job from the post-sync detector is widened to a
            # full pass instead of queueing a second one.
            if existing.status == JobStatus.QUEUED:
                existing.payload = {
                    key: value for key, value in existing.payload.items()
                    if key not in ("since_version", "target_version")
                } | ({"configure_task": configure_task} if configure_task else {})
            db.commit()
            return JobRead.model_validate(existing)
    else:
        # Metadata-only policy: a publish is all it takes (Pulp signs
        # repomd.xml on every publish).
        job_type = "signing.publish_repository_metadata"
        payload = {"repository_href": href}
    if configure_task:
        payload["configure_task"] = configure_task
    job = enqueue_job(db, job_type, payload, requested_by=user.username)
    db.commit()
    return JobRead.model_validate(job)
