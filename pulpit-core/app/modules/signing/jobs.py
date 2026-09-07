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
import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app.adapters.pulp import PulpAdapterError, PulpClient, PulpNotFoundError, get_pulp_client
from app.core.config import get_settings
from app.core.events import event_bus
from app.core.events.types import (
    SIGNING_KEY_ACTIVATED,
    SIGNING_KEY_GENERATED,
    SIGNING_KEY_RETIRED,
    SIGNING_KEY_ROTATED,
)
from app.core.jobs.registry import job_registry
from app.core.jobs.service import enqueue_job
from app.modules.signing import rotation, service
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
        enqueue_job(db, "signing.resign_repository_packages", {"repository_href": repo_href, "fingerprint": key.fingerprint})
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
    """The cheap half of "re-sign everything" (docs/signing.md): pulp_rpm
    regenerates and signs repomd.xml from scratch on every publish, so
    getting existing content's *metadata* under the new key is just
    triggering a normal, natively-supported Pulp publish - no custom
    resigning logic needed, unlike packages."""
    pulp = get_pulp_client()
    task = pulp.create_publication(payload["repository_href"])
    return {"pulp_task": task.get("task")}


def resign_repository_packages_job(db: Session, payload: dict) -> dict:
    """The expensive half (docs/signing.md "Known limitations" /
    "How resigning actually works"): pulp_rpm has no API to re-sign a
    package already in a repository, so this downloads each one through the
    repository's own published content (the same path a real dnf client
    uses - never touching /var/lib/pulp directly, task section 8),
    re-signs it locally with the new key, re-uploads it as a new content
    unit, and swaps it into the repository in one new version. This
    necessarily changes every resigned package's checksum and creates a new
    repository version - not a lightweight operation, which is exactly why
    it is its own job, per repository, never run inline with key
    publishing.
    """
    from app.modules.signing.rpm_resign import RpmResignError, resign_rpm_file

    repository_href = payload["repository_href"]
    fingerprint = payload["fingerprint"]
    pulp = get_pulp_client()
    settings = get_settings()

    repo = pulp.get_rpm_repository(repository_href)
    if repo["latest_version_href"].rstrip("/").endswith("/versions/0"):
        # Pulp's convention for "this repository has never had content added"
        # - nothing to resign, and real-world repositories reach this state
        # often (freshly created, not yet synced). Not requiring a
        # distribution in this case avoids a needless failed job for a
        # repository that has nothing to fetch in the first place.
        return {"resigned": 0, "skipped": 0}

    distributions = pulp.list_distributions_for_repository(repository_href)
    if not distributions:
        raise ValueError(
            "Cannot resign packages: this repository has no distribution to fetch existing "
            "packages from (see docs/signing.md 'Known limitations')."
        )
    base_url = distributions[0]["base_url"]

    # Publish first and wait for it, so the metadata read below reflects
    # exactly the packages in the CURRENT latest version - not a stale
    # publication from before whatever change triggered this job.
    publish_task = pulp.wait_for_task(pulp.create_publication(repository_href)["task"])
    if publish_task["state"] != "completed":
        raise PulpAdapterError(f"Publish before resigning failed: {publish_task.get('error')}")

    from app.modules.signing.repo_metadata import build_checksum_to_location_map

    checksum_to_location = build_checksum_to_location_map(pulp, base_url)

    # Not re-fetched: publishing creates a publication, never a new
    # repository *version* - `repo` above already reflects the version
    # being resigned.
    add_units: list[str] = []
    remove_units: list[str] = []
    skipped = 0
    offset = 0
    while True:
        page = pulp.list_rpm_packages(repository_version=repo["latest_version_href"], offset=offset)
        for package in page["results"]:
            href = checksum_to_location.get(package["sha256"])
            if href is None:
                skipped += 1
                logger.warning(
                    "Skipping package %s: not found in published metadata (%s)",
                    package["pulp_href"],
                    repository_href,
                )
                continue
            content = pulp.get_content_bytes(f"{base_url.rstrip('/')}/{href}")
            with tempfile.TemporaryDirectory() as tmp:
                local_path = Path(tmp) / Path(href).name
                local_path.write_bytes(content)
                try:
                    resign_rpm_file(local_path, fingerprint=fingerprint, gnupg_home=settings.signing_gnupg_home)
                except RpmResignError as exc:
                    skipped += 1
                    logger.error("Failed to resign %s: %s", package["pulp_href"], exc)
                    continue
                uploaded = pulp.upload_rpm_package(local_path.name, local_path.read_bytes())
            add_units.append(uploaded["pulp_href"])
            remove_units.append(package["pulp_href"])
        if page.get("next") is None:
            break
        offset += len(page["results"])

    if add_units or remove_units:
        modify_task = pulp.wait_for_task(
            pulp.modify_rpm_repository(
                repository_href, add_content_units=add_units, remove_content_units=remove_units
            )["task"]
        )
        if modify_task["state"] != "completed":
            raise PulpAdapterError(f"Repository modify after resigning failed: {modify_task.get('error')}")
        # Republish so the distribution actually serves the resigned content -
        # the base_url used above still points at the pre-resign publication
        # until this happens.
        pulp.wait_for_task(pulp.create_publication(repository_href)["task"])

    return {"resigned": len(add_units), "skipped": skipped}


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
    """The "Sign packages" / "Sign metadata" repository actions: applies the
    *current* global signing policy to one repository's Pulp fields. This
    only affects content signed from this point forward for packages
    (on-upload only); if the repository is switching metadata signing on,
    Pulp signs the very next publish, so no separate job is needed here."""
    settings_row = service.get_settings_row(db)
    active_key = service.get_active_key(db)
    if active_key is None:
        raise ValueError("No active signing key")
    pulp = get_pulp_client()
    href = payload["repository_href"]
    try:
        repo = pulp.get_rpm_repository(href)
    except PulpNotFoundError as exc:
        raise ValueError("Repository not found in Pulp") from exc

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
    untouched (no needless PATCH/resign for something already signed)."""
    settings_row = service.get_settings_row(db)
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
            needs_package = (
                package_row is not None
                and repo.get("package_signing_service") != target_package_href
            )
            needs_metadata = (
                metadata_row is not None
                and repo.get("metadata_signing_service") != target_metadata_href
            )
            if not needs_package and not needs_metadata:
                continue

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
            if needs_package:
                repos_to_resign.append(href)
            if needs_metadata:
                repos_to_republish.add(href)

        if page.get("next") is None:
            break
        offset += len(page["results"])

    # Mandatory follow-through, same as publish_key_job: a repository that
    # just started using a signing service needs its already-synced content
    # actually brought under it, not just future uploads/publishes.
    for href in repos_to_resign:
        enqueue_job(
            db,
            "signing.resign_repository_packages",
            {"repository_href": href, "fingerprint": active_key.fingerprint},
        )
    for href in repos_to_republish - set(repos_to_resign):
        enqueue_job(db, "signing.publish_repository_metadata", {"repository_href": href})

    return {
        "updated_count": len(updated),
        "updated": updated,
        "resigning_count": len(repos_to_resign),
        "republishing_count": len(repos_to_republish - set(repos_to_resign)),
        "failed": failed,
    }


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
