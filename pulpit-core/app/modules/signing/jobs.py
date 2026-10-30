"""Job handlers for the signing module, registered under the "signing.*"
namespace (app/core/jobs/registry.py). Only ever executed by pulpit-worker's
loop (worker/main.py) - the API process only enqueues rows into the `jobs`
table (app/modules/signing/routes/*.py) and polls their status.

Handlers that need GPG/RPM tooling import it lazily, inside the function
body, never at module import time - see gpg_local.py's docstring for why:
this file is imported by both processes (module registration happens in
both, task/registry design in app/modules/registry.py), but only the worker
image has the `gpg`/`rpm`/`rpmsign` binaries and the GNUPGHOME volume at all.
"""

import logging
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.adapters.pulp import PulpAdapterError, PulpClient, get_pulp_client
from app.core.config import get_settings
from app.core.events import event_bus
from app.core.events.types import (
    REPOSITORY_SYNCED,
    SIGNING_KEY_ACTIVATED,
    SIGNING_KEY_GENERATED,
    SIGNING_KEY_RETIRED,
    SIGNING_KEY_ROTATED,
)
from app.core.jobs.registry import job_registry
from app.core.jobs.service import enqueue_job, has_matching_pending_job
from app.modules.signing import repository_sync_state, rotation, service
from app.modules.signing.models import (
    KeyState,
    PulpServicePurpose,
    PulpServiceStatus,
    SigningKey,
    SigningPulpService,
    SigningRotation,
)
from app.modules.signing.pulp_bootstrap import (
    build_bootstrap_command,
    build_manifest_entry,
    refresh_pulp_service_status,
    write_signing_services_manifest,
)

MODULE = "signing"
logger = logging.getLogger(__name__)

# Page size for the RPM package content listing during resigning - large
# enough that a 26k-package repository (EPEL-sized) needs ~27 requests
# instead of ~265 (limit=100), small enough to stay a normal, boring list
# response.
_RESIGN_PAGE_SIZE = 1000

# Matches deployment/docker/pulp/pulpit-signing-reconciler's own
# POLL_INTERVAL_SECONDS - once a service is pending, re-checking any faster
# than the reconciler itself polls just wastes a job run. Capped so a
# deployment that never registers the service (vanilla pulp/pulp:stable, no
# reconciler) falls back to rotation_check's normal 300s cadence instead of
# polling every 30s forever.
_BOOTSTRAP_QUICK_RETRY_SECONDS = 30
_BOOTSTRAP_QUICK_RETRY_LIMIT = 10


def _local_key_manager():
    from app.modules.signing.gpg_local import LocalGPGKeyManager

    return LocalGPGKeyManager(get_settings().signing_gnupg_home)


def _ensure_pulp_service_row(
    db: Session, *, purpose: PulpServicePurpose, key: SigningKey, settings_row
) -> SigningPulpService:
    """Package purpose reuses one long-lived generic service forever
    (fingerprint is overridden per-repository - docs/signing.md); metadata
    purpose gets a fresh row every rotation because pulpcore's SigningService
    is immutable (see models.py SigningPulpService docstring)."""
    existing = None
    if purpose == PulpServicePurpose.PACKAGE:
        existing = (
            db.query(SigningPulpService)
            .filter(SigningPulpService.purpose == purpose)
            .filter(SigningPulpService.status != PulpServiceStatus.SUPERSEDED)
            .order_by(SigningPulpService.created_at.desc())
            .first()
        )
        if existing is not None:
            return existing
        name = settings_row.rpm_signing_service_name
    else:
        name = f"{settings_row.metadata_signing_service_name} ({key.key_id})"

    row = SigningPulpService(
        purpose=purpose,
        signing_key_id=key.id,
        name=name,
        status=PulpServiceStatus.PENDING_MANUAL_SETUP,
        fingerprint=key.fingerprint,
        bootstrap_command=build_bootstrap_command(
            purpose=purpose,
            service_name=name,
            fingerprint=key.fingerprint,
            scripts_dir=str(get_settings().signing_scripts_dir),
            gnupg_home=str(get_settings().signing_gnupg_home),
        ),
    )
    db.add(row)
    db.flush()
    return row


def generate_key_job(db: Session, payload: dict) -> dict:
    settings_row = service.get_settings_row(db)
    db.commit()
    validity_days = payload.get("validity_days") or settings_row.validity_days
    no_expiration = bool(payload.get("no_expiration"))
    if no_expiration:
        if not settings_row.allow_indefinite_validity:
            raise ValueError(
                "Non-expiring keys are disabled by policy (signing_settings.allow_indefinite_validity)"
            )
        validity_days = None

    manager = _local_key_manager()
    generated = manager.generate_key(
        identity_name=settings_row.identity_name,
        identity_email=settings_row.identity_email,
        algorithm=settings_row.algorithm,
        validity_days=validity_days,
    )

    key = SigningKey(
        state=KeyState.NEXT,
        key_id=generated.key_id,
        fingerprint=generated.fingerprint,
        identity_name=settings_row.identity_name,
        identity_email=settings_row.identity_email,
        algorithm=settings_row.algorithm,
        public_key_armor=generated.public_key_armor,
        generated_by="local-gpg",
        expires_at=generated.expires_at,
    )
    db.add(key)
    db.flush()

    if settings_row.package_signing_enabled:
        _ensure_pulp_service_row(
            db, purpose=PulpServicePurpose.PACKAGE, key=key, settings_row=settings_row
        )
    if settings_row.metadata_signing_enabled:
        _ensure_pulp_service_row(
            db, purpose=PulpServicePurpose.METADATA, key=key, settings_row=settings_row
        )

    if settings_row.package_signing_enabled or settings_row.metadata_signing_enabled:
        # Writes the manifest for the colocated reconciler right away instead
        # of waiting for the next scheduled rotation_check (up to 300s later)
        # - see check_pulp_bootstrap_job's own quick-retry loop for what
        # happens after this first attempt.
        enqueue_job(db, "signing.check_pulp_bootstrap", {})

    db.add(
        SigningRotation(
            triggered_by=payload.get("triggered_by", "manual"),
            phase="generated",
            to_key_id=key.id,
            notes=payload.get("reason", ""),
        )
    )
    event_bus.publish(
        db, SIGNING_KEY_GENERATED, {"key_id": str(key.id), "fingerprint": key.fingerprint}, source_module=MODULE
    )

    # A key with nothing currently active goes live immediately - see
    # rotation.should_activate_next's bootstrap branch. Enqueued as its own
    # job (not called inline) so a Pulp/network hiccup during publishing
    # can't roll back the key that was just successfully generated - each
    # step stays independently retryable (task section 12).
    if service.get_active_key(db) is None:
        enqueue_job(
            db,
            "signing.publish_key",
            {"key_id": str(key.id), "triggered_by": payload.get("triggered_by", "manual")},
        )

    return {"key_id": str(key.id), "fingerprint": key.fingerprint}


def _apply_package_fingerprint_everywhere(
    pulp: PulpClient, package_service_href: str, fingerprint: str
) -> list[str]:
    """Package-signing publish never recreates the Pulp SigningService
    (docs/signing.md) - it only needs every repository currently using it to
    start passing the new fingerprint override. Metadata publish instead
    repoints repositories at a brand-new service href (see
    `_repoint_metadata_service`). Returns the hrefs of repositories updated,
    so the caller knows which ones now need their existing packages
    resigned."""
    updated: list[str] = []
    offset = 0
    while True:
        page = pulp.list_rpm_repositories(offset=offset)
        for repo in page["results"]:
            if repo.get("package_signing_service") != package_service_href:
                continue
            pulp.update_rpm_repository_signing(
                repo["pulp_href"],
                package_signing_service=package_service_href,
                package_signing_fingerprint=fingerprint,
                metadata_signing_service=repo.get("metadata_signing_service"),
            )
            updated.append(repo["pulp_href"])
        if page.get("next") is None:
            break
        offset += len(page["results"])
    return updated


def _repoint_metadata_service(pulp: PulpClient, old_href: str | None, new_href: str) -> list[str]:
    if old_href is None:
        return []
    updated: list[str] = []
    offset = 0
    while True:
        page = pulp.list_rpm_repositories(offset=offset)
        for repo in page["results"]:
            if repo.get("metadata_signing_service") == old_href:
                pulp.update_rpm_repository_signing(
                    repo["pulp_href"],
                    package_signing_service=repo.get("package_signing_service"),
                    package_signing_fingerprint=repo.get("package_signing_fingerprint"),
                    metadata_signing_service=new_href,
                )
                updated.append(repo["pulp_href"])
        if page.get("next") is None:
            break
        offset += len(page["results"])
    return updated


def _enqueue_resign_job(
    db: Session,
    *,
    repository_href: str,
    fingerprint: str,
    since_version: str | None = None,
    target_version: str | None = None,
) -> bool:
    """Enqueues `signing.resign_repository_packages`, deduplicated by
    `(repository_href, fingerprint)` (task requirement: two equivalent
    resign jobs for the same repository must never be queued/running at
    once). `since_version`/`target_version` are only set by
    `detect_repository_content_changes_job`'s incremental path - a full
    sweep (key rotation via `publish_key_job`, or `apply_signing_to_all_
    repositories_job`) omits them, which `resign_repository_packages_job`
    treats as "evaluate every package in the current latest version" (still
    cheap per-package thanks to the signing_keys/cache checks, just not
    scoped to a specific version range). Returns whether a job was actually
    enqueued (False when a matching one was already in flight)."""
    fingerprint = fingerprint.removeprefix("v4:").upper()
    if has_matching_pending_job(
        db,
        "signing.resign_repository_packages",
        payload_subset={"repository_href": repository_href, "fingerprint": fingerprint},
    ):
        return False
    payload: dict = {"repository_href": repository_href, "fingerprint": fingerprint}
    if since_version is not None:
        payload["since_version"] = since_version
    if target_version is not None:
        payload["target_version"] = target_version
    enqueue_job(db, "signing.resign_repository_packages", payload)
    return True


def publish_key_job(db: Session, payload: dict) -> dict:
    """Publishes a key as THE single active signing key (task requirement:
    "one active key ... we always expose the same [public URL]"). Unlike a
    coexistence model, this repoints every affected repository immediately
    and unconditionally schedules re-signing/re-publishing so already-synced
    content actually ends up under the new key too - see
    `resign_repository_packages_job`/`publish_repository_metadata_job`,
    both enqueued here, never run inline (task section 12)."""
    key = service.get_key(db, payload["key_id"])
    if key is None:
        raise ValueError("Unknown key")
    settings_row = service.get_settings_row(db)
    db.commit()
    pulp = get_pulp_client()

    package_row = (
        db.query(SigningPulpService)
        .filter(SigningPulpService.purpose == PulpServicePurpose.PACKAGE)
        .filter(SigningPulpService.status != PulpServiceStatus.SUPERSEDED)
        .order_by(SigningPulpService.created_at.desc())
        .first()
    )
    metadata_row = (
        db.query(SigningPulpService)
        .filter(SigningPulpService.purpose == PulpServicePurpose.METADATA)
        .filter(SigningPulpService.signing_key_id == key.id)
        .first()
    )

    for row in (package_row, metadata_row):
        if row is not None:
            try:
                refresh_pulp_service_status(pulp, row)
            except PulpAdapterError:
                # Pulp being transiently unreachable is not the same as "the
                # service still needs registering" - treat it as not-ready-
                # this-time rather than exhausting this job's retry budget.
                # signing.rotation_check / check_pulp_bootstrap will try
                # again on their own schedule regardless.
                pass

    package_ready = package_row is None or not settings_row.package_signing_enabled or package_row.status == PulpServiceStatus.ACTIVE
    metadata_ready = metadata_row is None or not settings_row.metadata_signing_enabled or metadata_row.status == PulpServiceStatus.ACTIVE
    if not (package_ready and metadata_ready):
        db.flush()
        return {"status": "waiting_on_manual_pulp_setup"}

    old_active = service.get_active_key(db)
    now = datetime.now(UTC)

    repos_to_resign: list[str] = []
    repos_to_republish: set[str] = set()

    if package_row is not None and package_row.status == PulpServiceStatus.ACTIVE:
        # pulp_href is only nullable before a service is registered
        # (refresh_pulp_service_status sets it) - ACTIVE implies registered.
        assert package_row.pulp_href is not None
        repos_to_resign = _apply_package_fingerprint_everywhere(
            pulp, package_row.pulp_href, key.fingerprint
        )
        repos_to_republish.update(repos_to_resign)

    if metadata_row is not None and metadata_row.status == PulpServiceStatus.ACTIVE:
        old_metadata_row = None
        if old_active is not None:
            old_metadata_row = (
                db.query(SigningPulpService)
                .filter(SigningPulpService.purpose == PulpServicePurpose.METADATA)
                .filter(SigningPulpService.signing_key_id == old_active.id)
                .first()
            )
        # Same ACTIVE-implies-registered invariant as package_row above.
        assert metadata_row.pulp_href is not None
        repos_to_republish.update(
            _repoint_metadata_service(
                pulp,
                old_metadata_row.pulp_href if old_metadata_row else None,
                metadata_row.pulp_href,
            )
        )
        if old_metadata_row is not None:
            old_metadata_row.status = PulpServiceStatus.SUPERSEDED

    key.state = KeyState.ACTIVE
    key.activated_at = now
    if old_active is not None:
        old_active.state = KeyState.RETIRING
        old_active.retiring_at = now

    db.add(
        SigningRotation(
            triggered_by=payload.get("triggered_by", "manual"),
            phase="activated",
            from_key_id=old_active.id if old_active else None,
            to_key_id=key.id,
        )
    )
    event_bus.publish(db, SIGNING_KEY_ACTIVATED, {"key_id": str(key.id)}, source_module=MODULE)
    if old_active is not None:
        event_bus.publish(
            db, SIGNING_KEY_ROTATED, {"from_key_id": str(old_active.id), "to_key_id": str(key.id)}, source_module=MODULE
        )

    # Mandatory, not policy-gated (task requirement: publishing a key always
    # brings existing content under it - "c'est pas une option
    # désactivable"). Split into one job per repository so a failure on one
    # repository never blocks the others, and each is independently
    # retryable/trackable like any other job.
    for repo_href in repos_to_resign:
        _enqueue_resign_job(db, repository_href=repo_href, fingerprint=key.fingerprint)
    for repo_href in repos_to_republish - set(repos_to_resign):
        enqueue_job(db, "signing.publish_repository_metadata", {"repository_href": repo_href})

    return {"status": "published", "key_id": str(key.id), "repositories_resigning": len(repos_to_resign)}


def retire_key_job(db: Session, payload: dict) -> dict:
    key = service.get_key(db, payload["key_id"])
    if key is None or key.state != KeyState.RETIRING:
        return {"status": "skipped"}
    key.state = KeyState.RETIRED
    key.retired_at = datetime.now(UTC)
    db.add(SigningRotation(triggered_by=payload.get("triggered_by", "schedule"), phase="retired", to_key_id=key.id))
    event_bus.publish(db, SIGNING_KEY_RETIRED, {"key_id": str(key.id)}, source_module=MODULE)
    return {"status": "retired"}


def extend_expiration_job(db: Session, payload: dict) -> dict:
    key = service.get_key(db, payload["key_id"])
    if key is None:
        raise ValueError("Unknown key")
    manager = _local_key_manager()
    new_expiry = manager.extend_expiration(key.fingerprint, payload["new_validity_days"])
    key.expires_at = new_expiry
    return {"expires_at": new_expiry.isoformat() if new_expiry else None}


def publish_repository_metadata_job(db: Session, payload: dict) -> dict:
    db.commit()
    pulp = get_pulp_client()
    _wait_for_configuration_task(pulp, payload)
    result = pulp.create_publication(payload["repository_href"])
    task = pulp.wait_for_task(result["task"])
    if task["state"] != "completed":
        raise ValueError(f"Signed metadata publication {task['state']}: {task.get('error')}")
    return {"pulp_task": result["task"]}


def _wait_for_configuration_task(pulp: PulpClient, payload: dict) -> None:
    """The per-repository "Re-sign" action (routes/repositories.py `/resign`)
    first re-applies the signing policy to the repository with the caller's
    own credentials; that PATCH may come back as a Pulp task. The resign /
    republish must only start once it has landed, or it would publish with
    the repository's previous (possibly missing) signing services."""
    task_href = payload.get("configure_task")
    if not task_href:
        return
    task = pulp.wait_for_task(task_href)
    if task["state"] != "completed":
        raise ValueError(f"Pulp signing configuration {task['state']}: {task.get('error')}")


def _paginate_rpm_packages(pulp: PulpClient, **filters: str) -> Iterator[dict]:
    offset = 0
    while True:
        page = pulp.list_rpm_packages(limit=_RESIGN_PAGE_SIZE, offset=offset, **filters)
        yield from page["results"]
        if page.get("next") is None:
            return
        offset += len(page["results"])


def _needs_signing(package: dict, fingerprint: str) -> bool:
    """Match Pulp's prefixed fingerprints and legacy RPM issuer key IDs."""
    expected = fingerprint.lower().removeprefix("v4:")
    for key in package.get("signing_keys") or []:
        if not isinstance(key, str):
            continue
        key = key.lower()
        if key.startswith("keyid:"):
            if expected[-16:] == key.removeprefix("keyid:"):
                return False
        elif key.removeprefix("v4:") == expected:
            return False
    return True


def resign_repository_packages_job(db: Session, payload: dict) -> dict:
    """Prepare signed content in Pulp before exposing a publication.

    Pulp's signing-policy plugin materializes on-demand content, signs via
    its native signing service/cache, and finalizes the version atomically.
    No public distribution or preliminary unsigned publication is needed.
    """
    db.commit()
    pulp = get_pulp_client()
    _wait_for_configuration_task(pulp, payload)
    components = {entry["component"] for entry in pulp.get_status().get("versions", [])}
    if "pulp_rpm_signing_policy" not in components:
        raise ValueError("Upgrade the Pulp image: the RPM signing-policy plugin is required for safe signing.")
    href = payload["repository_href"]
    fingerprint = payload["fingerprint"]
    repo = pulp.get_rpm_repository(href)
    actual_fingerprint = (repo.get("package_signing_fingerprint") or "").removeprefix("v4:")
    if not repo.get("package_signing_service") or actual_fingerprint.upper() != fingerprint.removeprefix("v4:").upper():
        raise ValueError("Repository signing configuration changed; submit Re-sign again.")
    version = repo["latest_version_href"]
    packages = list(_paginate_rpm_packages(pulp, repository_version=version))
    candidates = sum(_needs_signing(package, fingerprint) for package in packages)
    if candidates:
        # Empty modify still enters RepositoryVersion.finalize_new_version:
        # the policy hook replaces unsafe packages before completion.
        preparation = pulp.modify_rpm_repository(href, add_content_units=[], remove_content_units=[])
        task = pulp.wait_for_task(preparation["task"])
        if task["state"] != "completed":
            raise ValueError(f"RPM signing preparation {task['state']}: {task.get('error')}")
        repo = pulp.get_rpm_repository(href)
        version = repo["latest_version_href"]
        if any(_needs_signing(package, fingerprint) for package in _paginate_rpm_packages(pulp, repository_version=version)):
            raise ValueError("Signing did not prepare every package; no publication was requested.")
    if (candidates and not repo.get("autopublish")) or (not candidates and payload.get("force_publish")):
        publication = pulp.create_publication(href)
        task = pulp.wait_for_task(publication["task"])
        if task["state"] != "completed":
            raise ValueError(f"Signed publication {task['state']}: {task.get('error')}")
    repository_sync_state.advance(db, href, repository_sync_state.version_number(version))
    db.commit()
    return {"evaluated": len(packages), "candidates": candidates, "signed": candidates,
            "resigned": candidates, "failed": 0, "skipped": 0, "engine": "pulp"}


def check_pulp_bootstrap_job(db: Session, payload: dict) -> dict:
    """Polls Pulp for pending SigningService rows. Registration itself isn't
    done here (docs/signing.md "Automating the manual Pulp step",
    docs/adr/0008-colocated-signing-reconciler.md): this job only publishes
    the desired-state manifest a small reconciler baked into the derived
    Pulp image (deployment/docker/pulp/pulpit-signing-reconciler) reads and
    acts on from *inside* the `pulp` container. This job's own
    responsibility is just detecting completion (as before, by polling
    Pulp's signing-services list) and re-attempting publishing once ready.
    Scheduled periodically (rotation_check_job) and immediately after key
    generation (generate_key_job); while a row is still pending afterward,
    reschedules itself every _BOOTSTRAP_QUICK_RETRY_SECONDS (matching the
    reconciler's own poll interval) up to _BOOTSTRAP_QUICK_RETRY_LIMIT times,
    so the common case resolves in under a minute instead of waiting for
    rotation_check_job's next 300s cycle - falls back to that slower cadence
    once the retry budget is spent (e.g. no reconciler present at all)."""
    pulp = get_pulp_client()
    settings = get_settings()
    pending = (
        db.query(SigningPulpService)
        .filter(SigningPulpService.status == PulpServiceStatus.PENDING_MANUAL_SETUP)
        .all()
    )

    manifest_entries = [
        build_manifest_entry(
            purpose=row.purpose,
            service_name=row.name,
            fingerprint=row.fingerprint,
            scripts_dir=str(settings.signing_scripts_dir),
            gnupg_home=str(settings.signing_gnupg_home),
        )
        for row in pending
    ]
    try:
        write_signing_services_manifest(
            manifest_entries,
            manifest_path=str(settings.signing_scripts_dir / settings.signing_manifest_filename),
        )
    except OSError:
        # Best-effort, same as the executor it replaced: a deployment not
        # running the derived Pulp image never had this manifest read
        # anyway, and the manual command below keeps working regardless.
        logger.exception("Failed to write signing-services manifest for the colocated reconciler")

    became_active = []
    for row in pending:
        try:
            if refresh_pulp_service_status(pulp, row):
                became_active.append(str(row.id))
        except PulpAdapterError:
            continue  # try the rest; this row's turn will come on the next scheduled check

    next_key = service.get_next_key(db)
    if next_key is not None:
        # Re-attempts publishing on every scheduled check while a NEXT key
        # exists, not just when something *just* became active - covers a
        # previous signing.publish_key attempt permanently failing for an
        # unrelated transient reason (its own retry budget is independent
        # of this scheduled check's). Cheap and self-limiting:
        # publish_key_job's own readiness check no-ops until everything
        # this key needs is actually ACTIVE, and get_next_key stops
        # returning a key at all once it succeeds.
        enqueue_job(db, "signing.publish_key", {"key_id": str(next_key.id), "triggered_by": "schedule"})

    still_pending = len(pending) - len(became_active)
    quick_retry = payload.get("quick_retry", 0)
    if still_pending > 0 and quick_retry < _BOOTSTRAP_QUICK_RETRY_LIMIT:
        enqueue_job(
            db,
            "signing.check_pulp_bootstrap",
            {"quick_retry": quick_retry + 1},
            run_at=datetime.now(UTC) + timedelta(seconds=_BOOTSTRAP_QUICK_RETRY_SECONDS),
        )

    return {"became_active": became_active}


def rotation_check_job(db: Session, payload: dict) -> dict:
    """The scheduled heartbeat (task section 6: "Rotation checks should be
    executed asynchronously/scheduled, not during ordinary HTTP requests").
    Pure decisions come from rotation.py; this just turns a decision into a
    follow-up job so each step stays small, auditable, and independently
    retryable."""
    settings_row = service.get_settings_row(db)
    db.commit()
    now = rotation.utcnow()
    actions: list[str] = []

    if settings_row.signing_enabled:
        active_key = service.get_active_key(db)
        next_key = service.get_next_key(db)

        if active_key is None and next_key is None:
            enqueue_job(db, "signing.generate_key", {"triggered_by": "schedule"})
            actions.append("generate_key(bootstrap)")
        else:
            if rotation.should_generate_next(active_key, next_key, settings_row, now):
                enqueue_job(db, "signing.generate_key", {"triggered_by": "schedule"})
                actions.append("generate_key")
            if rotation.should_activate_next(active_key, next_key, settings_row, now):
                # should_activate_next only returns True when next_key isn't
                # None (see rotation.py).
                assert next_key is not None
                enqueue_job(
                    db,
                    "signing.publish_key",
                    {"key_id": str(next_key.id), "triggered_by": "schedule"},
                )
                actions.append("publish_key")

    for key in db.query(SigningKey).filter(SigningKey.state == KeyState.RETIRING).all():
        if rotation.should_retire(key, settings_row, now):
            enqueue_job(db, "signing.retire_key", {"key_id": str(key.id), "triggered_by": "schedule"})
            actions.append(f"retire_key({key.id})")

    enqueue_job(db, "signing.check_pulp_bootstrap", {})
    return {"actions": actions}


def configure_repository_signing_job(db: Session, payload: dict) -> dict:
    # Old queued commands never bypass the new caller-authorized request path.
    task_href = payload.get("pulp_task")
    if not task_href:
        raise ValueError("Please submit repository signing configuration again")
    task = get_pulp_client().wait_for_task(task_href)
    if task["state"] != "completed":
        raise ValueError(f"Pulp signing configuration {task['state']}: {task.get('error')}")
    return {"pulp_task": task_href}


def configure_repository_signing(db: Session, payload: dict, pulp: PulpClient) -> dict:
    """The "Sign packages" / "Sign metadata" repository actions: applies the
    *current* global signing policy to one repository's Pulp fields. This
    sets the repository policy enforced by the derived Pulp image.
    Existing content is repaired by the queued preparation job; new
    versions and publications must satisfy that policy before exposure."""
    settings_row = service.get_settings_row(db)
    db.commit()
    active_key = service.get_active_key(db)
    if active_key is None:
        raise ValueError("No active signing key")
    href = payload["repository_href"]
    repo = pulp.get_rpm_repository(href)

    package_row = (
        db.query(SigningPulpService)
        .filter(SigningPulpService.purpose == PulpServicePurpose.PACKAGE)
        .filter(SigningPulpService.status == PulpServiceStatus.ACTIVE)
        .first()
    )
    metadata_row = (
        db.query(SigningPulpService)
        .filter(SigningPulpService.purpose == PulpServicePurpose.METADATA)
        .filter(SigningPulpService.signing_key_id == active_key.id)
        .filter(SigningPulpService.status == PulpServiceStatus.ACTIVE)
        .first()
    )

    package_signing_service = repo.get("package_signing_service")
    package_signing_fingerprint = repo.get("package_signing_fingerprint")
    metadata_signing_service = repo.get("metadata_signing_service")

    if payload.get("sign_packages") and settings_row.package_signing_enabled:
        if package_row is None:
            raise ValueError("Package signing service is not active yet (pending manual Pulp setup)")
        package_signing_service = package_row.pulp_href
        package_signing_fingerprint = active_key.fingerprint
    elif payload.get("sign_packages") is False:
        package_signing_service = None
        package_signing_fingerprint = None

    if payload.get("sign_metadata") and settings_row.metadata_signing_enabled:
        if metadata_row is None:
            raise ValueError("Metadata signing service is not active yet (pending manual Pulp setup)")
        metadata_signing_service = metadata_row.pulp_href
    elif payload.get("sign_metadata") is False:
        metadata_signing_service = None

    task = pulp.update_rpm_repository_signing(
        href,
        package_signing_service=package_signing_service,
        package_signing_fingerprint=package_signing_fingerprint,
        metadata_signing_service=metadata_signing_service,
    )
    return {"pulp_task": task.get("task")}


def apply_signing_to_all_repositories_job(db: Session, payload: dict) -> dict:
    """The manual, explicit "make every existing RPM repository actually
    signed" sweep. Repository create/edit no longer expose a per-repository
    signing choice (task decision: signing is fully automatic for every
    repository once enabled globally, not an opt-in) - a repository created
    before signing was turned on (or before this policy existed) never
    otherwise catches up on its own, so this is how an administrator brings
    the whole instance into line on demand.

    Mirrors publish_key_job's own repo-walk + resign/republish-enqueuing
    logic (same repos_to_resign/repos_to_republish split - package resigning
    is the expensive, content-rewriting half; metadata is just a republish),
    just comparing every repository's current fields against what the
    active key's services should be, instead of an old-href-to-new-href
    rotation repoint. A repository already correctly configured is left
    untouched (no needless PATCH/resign for something already signed).

    Content conformance is checked independently of configuration
    conformance (task bug fix): a repository can already have the right
    `package_signing_service`/`package_signing_fingerprint` and still
    contain packages that were never actually resigned (`signing_keys:
    null`) or were resigned under an old key - `package_signing_service`
    matching target alone used to be treated as "nothing to do" here, which
    is wrong. `repository_sync_state.needs_resign` (the same watermark
    `detect_repository_content_changes_job` advances after a sync) is the
    cheap signal used instead: a repository whose content has already been
    fully covered by a clean resign run is skipped even when this sweep
    runs again, but one that's never been touched (or has drifted) gets a
    `signing.resign_repository_packages` job - which itself only actually
    re-signs what its own signing_keys/cache check finds still needs it, so
    this never means "resign every RPM every time"."""
    settings_row = service.get_settings_row(db)
    db.commit()
    active_key = service.get_active_key(db)
    if active_key is None:
        return {
            "updated_count": 0,
            "updated": [],
            "resigning_count": 0,
            "republishing_count": 0,
            "failed": [],
            "skipped_reason": "no_active_key",
        }

    pulp = get_pulp_client()

    package_row = None
    if settings_row.package_signing_enabled:
        package_row = (
            db.query(SigningPulpService)
            .filter(SigningPulpService.purpose == PulpServicePurpose.PACKAGE)
            .filter(SigningPulpService.status == PulpServiceStatus.ACTIVE)
            .first()
        )
    metadata_row = None
    if settings_row.metadata_signing_enabled:
        metadata_row = (
            db.query(SigningPulpService)
            .filter(SigningPulpService.purpose == PulpServicePurpose.METADATA)
            .filter(SigningPulpService.signing_key_id == active_key.id)
            .filter(SigningPulpService.status == PulpServiceStatus.ACTIVE)
            .first()
        )

    target_package_href = package_row.pulp_href if package_row else None
    target_metadata_href = metadata_row.pulp_href if metadata_row else None

    updated: list[str] = []
    failed: list[dict] = []
    repos_to_resign: list[str] = []
    repos_to_republish: set[str] = set()

    offset = 0
    while True:
        page = pulp.list_rpm_repositories(offset=offset)
        for repo in page["results"]:
            href = repo["pulp_href"]
            needs_package_config = (
                package_row is not None
                and repo.get("package_signing_service") != target_package_href
            )
            needs_metadata = (
                metadata_row is not None
                and repo.get("metadata_signing_service") != target_metadata_href
            )
            # `or` short-circuits: a repository that already needs its
            # config fixed never pays for the extra sync-state lookup.
            needs_package_content = package_row is not None and (
                needs_package_config
                or repository_sync_state.needs_resign(db, href, repo.get("latest_version_href"))
            )

            if not (needs_package_config or needs_metadata or needs_package_content):
                continue

            if needs_package_config or needs_metadata:
                try:
                    pulp.update_rpm_repository_signing(
                        href,
                        package_signing_service=(
                            target_package_href if package_row else repo.get("package_signing_service")
                        ),
                        package_signing_fingerprint=(
                            active_key.fingerprint if package_row else repo.get("package_signing_fingerprint")
                        ),
                        metadata_signing_service=(
                            target_metadata_href if metadata_row else repo.get("metadata_signing_service")
                        ),
                    )
                except PulpAdapterError as exc:
                    failed.append({"repository": repo.get("name") or href, "error": str(exc)})
                    continue
                updated.append(href)

            if needs_package_content:
                repos_to_resign.append(href)
            if needs_metadata:
                repos_to_republish.add(href)

        if page.get("next") is None:
            break
        offset += len(page["results"])

    # Mandatory follow-through, same as publish_key_job: a repository that
    # just started using a signing service (or whose content just fell out
    # of conformance) needs it actually brought under the active key, not
    # just future uploads/publishes.
    for href in repos_to_resign:
        _enqueue_resign_job(db, repository_href=href, fingerprint=active_key.fingerprint)
    for href in repos_to_republish - set(repos_to_resign):
        enqueue_job(db, "signing.publish_repository_metadata", {"repository_href": href})

    return {
        "updated_count": len(updated),
        "updated": updated,
        "resigning_count": len(repos_to_resign),
        "republishing_count": len(repos_to_republish - set(repos_to_resign)),
        "failed": failed,
    }


def detect_repository_content_changes_job(db: Session, payload: dict) -> dict:
    """Closes the "a sync doesn't automatically resign new RPMs" gap (task's
    primary bug report): Pulpit's frontend talks to Pulp directly for
    repository sync (ADR 0005 - pulpit-core is never in that request path,
    unlike signing-specific actions), so there is no request hook here to
    react to. Instead, this scheduled job (`module.py`'s `scheduled_jobs`)
    periodically compares every package-signing-enabled repository's
    current `latest_version_href` against `signing_repository_sync_state`'s
    watermark (`repository_sync_state.needs_resign`) - the same version
    number pulp_rpm bumps on every sync - and enqueues an incremental
    `signing.resign_repository_packages` job scoped to exactly the versions
    added since the watermark (`since_version`/`target_version`) for any
    repository that has moved on.

    Deliberately does not resign anything itself, and does not wait for the
    resign job it enqueues - detecting the delta and doing the (parallel,
    potentially slow) signing work are kept as separate jobs, same
    separation of concerns as `publish_key_job` enqueuing rather than
    inlining its own resign jobs."""
    db.commit()
    pulp = get_pulp_client()
    checked = 0
    enqueued = 0
    pending = []
    offset = 0
    while True:
        page = pulp.list_rpm_repositories(offset=offset)
        for repo in page["results"]:
            href = repo["pulp_href"]
            fingerprint = repo.get("package_signing_fingerprint")
            service_href = repo.get("package_signing_service")
            latest_version_href = repo.get("latest_version_href")
            if not service_href or not fingerprint:
                continue  # repository isn't configured for package signing at all
            checked += 1
            if not repository_sync_state.needs_resign(db, href, latest_version_href):
                continue

            since_number = repository_sync_state.last_processed_version(db, href)
            since_version = (
                repository_sync_state.version_href(href, since_number) if since_number > 0 else None
            )
            pending.append((href, fingerprint, since_version, latest_version_href))
        if page.get("next") is None:
            break
        offset += len(page["results"])

    for href, fingerprint, since_version, latest_version_href in pending:
        if _enqueue_resign_job(
            db, repository_href=href, fingerprint=fingerprint,
            since_version=since_version, target_version=latest_version_href,
        ):
            enqueued += 1
            event_bus.publish(db, REPOSITORY_SYNCED,
                {"repository_href": href, "latest_version_href": latest_version_href}, source_module=MODULE)
    return {"checked": checked, "enqueued": enqueued}


def register() -> None:
    job_registry.register("signing.generate_key", generate_key_job)
    job_registry.register("signing.publish_key", publish_key_job)
    job_registry.register("signing.retire_key", retire_key_job)
    job_registry.register("signing.extend_expiration", extend_expiration_job)
    job_registry.register("signing.check_pulp_bootstrap", check_pulp_bootstrap_job)
    job_registry.register("signing.rotation_check", rotation_check_job)
    job_registry.register("signing.configure_repository_signing", configure_repository_signing_job)
    job_registry.register("signing.resign_repository_packages", resign_repository_packages_job)
    job_registry.register("signing.publish_repository_metadata", publish_repository_metadata_job)
    job_registry.register(
        "signing.apply_signing_to_all_repositories", apply_signing_to_all_repositories_job
    )
    job_registry.register(
        "signing.detect_repository_content_changes", detect_repository_content_changes_job
    )
