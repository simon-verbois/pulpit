import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import get_settings
from app.core.database.base import Base, TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin


class KeyState(str, enum.Enum):
    """Explicit lifecycle - never "delete old, generate new" (task section 5).

    NEXT     - generated ahead of time, not yet used for signing.
    ACTIVE   - the one currently used for new package/metadata signing.
    RETIRING - superseded, but its public key is still published/trusted so
               already-signed content and in-flight clients keep verifying.
    RETIRED  - retention window elapsed; kept as a historical record only.
    """

    NEXT = "next"
    ACTIVE = "active"
    RETIRING = "retiring"
    RETIRED = "retired"


class SigningSettings(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Singleton configuration row - always the one with the smallest
    created_at (see service.get_settings). Deliberately its own table, not a
    row in some shared generic "settings" table other modules would also
    write to (task section 14)."""

    __tablename__ = "signing_settings"

    signing_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    package_signing_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_signing_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    key_name: Mapped[str] = mapped_column(
        String(255), default=lambda: get_settings().signing_default_key_name
    )
    identity_name: Mapped[str] = mapped_column(
        String(255), default=lambda: get_settings().signing_default_identity_name
    )
    identity_email: Mapped[str] = mapped_column(
        String(255), default=lambda: get_settings().signing_default_identity_email
    )
    algorithm: Mapped[str] = mapped_column(
        String(64), default=lambda: get_settings().signing_default_algorithm
    )
    validity_days: Mapped[int] = mapped_column(
        Integer, default=lambda: get_settings().signing_default_validity_days
    )
    public_key_filename: Mapped[str] = mapped_column(
        String(255), default=lambda: get_settings().signing_default_public_key_filename
    )
    rpm_signing_service_name: Mapped[str] = mapped_column(
        String(255), default=lambda: get_settings().signing_default_rpm_service_name
    )
    metadata_signing_service_name: Mapped[str] = mapped_column(
        String(255), default=lambda: get_settings().signing_default_metadata_service_name
    )

    auto_rotation_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    rotation_generate_before_days: Mapped[int] = mapped_column(Integer, default=90)
    rotation_activate_before_days: Mapped[int] = mapped_column(Integer, default=30)
    key_retention_days: Mapped[int] = mapped_column(Integer, default=180)
    # Disabled by default (task section 4: "no expiration, if enabled by
    # policy") - a non-expiring key can never be auto-rotated on a schedule
    # (rotation.py has no expiry to count down from), so this is a deliberate
    # administrator opt-in, not the default.
    allow_indefinite_validity: Mapped[bool] = mapped_column(Boolean, default=False)


class SigningKey(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Public metadata about one generated key. Never a private-key column
    here or anywhere else in this database (task sections 4/14/15) - private
    key material lives only in pulpit-worker's GNUPGHOME volume."""

    __tablename__ = "signing_keys"

    state: Mapped[KeyState] = mapped_column(String(16), default=KeyState.NEXT, index=True)
    key_id: Mapped[str] = mapped_column(String(40))
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    identity_name: Mapped[str] = mapped_column(String(255))
    identity_email: Mapped[str] = mapped_column(String(255), default="")
    algorithm: Mapped[str] = mapped_column(String(64))
    public_key_armor: Mapped[str] = mapped_column(Text)
    generated_by: Mapped[str] = mapped_column(String(64), default="local-gpg")

    # BUG FOUND LIVE (docs/signing.md): without `timezone=True`, Postgres
    # stores these as TIMESTAMP WITHOUT TIME ZONE, which comes back as a
    # naive `datetime` - comparing it against `datetime.now(timezone.utc)`
    # in pure Python (rotation.py's threshold checks) then raises
    # "can't compare offset-naive and offset-aware datetimes". A SQLAlchemy
    # query *filter* using the same column doesn't hit this (Postgres does
    # the comparison, not Python), which is why this went unnoticed until a
    # real key with a real expiry was actually evaluated by the scheduler.
    activated_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    retiring_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    retired_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)


class PulpServicePurpose(str, enum.Enum):
    PACKAGE = "package"
    METADATA = "metadata"


class PulpServiceStatus(str, enum.Enum):
    # Pulp's SigningService can only be created via a management command run
    # on the Pulp server itself (VERIFIED, docs/PULP_API.md / docs/signing.md)
    # - pulpit-core can never do this over the REST API, so every new one
    # starts PENDING until an administrator runs the printed command.
    PENDING_MANUAL_SETUP = "pending_manual_setup"
    ACTIVE = "active"
    SUPERSEDED = "superseded"


class SigningPulpService(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tracks the Pulp-side `core.SigningService` object(s) backing this
    module's signing, and the fact that it is immutable
    (@hook(BEFORE_UPDATE) raises in pulpcore - VERIFIED, docs/signing.md):

    - PACKAGE: one long-lived generic service is enough forever, because
      pulp_rpm's per-repository `package_signing_fingerprint` overrides
      which key is actually used at sign time - rotation only updates that
      field on repositories, never this row.
    - METADATA: `metadata_signing_service` has no such override; the
      service's own bound fingerprint is what's used, so each metadata-key
      rotation must register a brand-new SigningService and this table gets
      a new row (old ones kept, never deleted - Pulp FK-protects them anyway
      while any repository still references them).
    """

    __tablename__ = "signing_pulp_services"

    purpose: Mapped[PulpServicePurpose] = mapped_column(String(16))
    status: Mapped[PulpServiceStatus] = mapped_column(
        String(24), default=PulpServiceStatus.PENDING_MANUAL_SETUP
    )
    signing_key_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("signing_keys.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255))
    pulp_href: Mapped[str | None] = mapped_column(String(512), nullable=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    bootstrap_command: Mapped[str] = mapped_column(Text)


class SigningRotation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Audit trail of rotation lifecycle transitions - lets the GUI/API show
    rotation history and lets support diagnose "what happened and when"
    without reconstructing it from signing_keys.*_at columns alone."""

    __tablename__ = "signing_rotations"

    triggered_by: Mapped[str] = mapped_column(String(32))  # "schedule" | "manual"
    phase: Mapped[str] = mapped_column(String(32))  # "generated"|"activated"|"retiring"|"retired"
    from_key_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("signing_keys.id"), nullable=True
    )
    to_key_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("signing_keys.id")
    )
    notes: Mapped[str] = mapped_column(Text, default="")


class RpmSigningCacheStatus(str, enum.Enum):
    """RUNNING is written by the main thread just before a worker starts
    downloading/signing/uploading a candidate (see jobs.py's
    `resign_repository_packages_job`) - a row still RUNNING after
    `_STALE_RUNNING_AFTER` (rpm_signing_cache.py) means the worker that owned
    it never got to report back (worker crash/restart), so it's treated as
    retryable rather than "someone else is already on it" forever."""

    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class RpmSigningCache(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Maps one already-resigned RPM back to the resigned content unit Pulp
    now holds for it, keyed by `(source_sha256, fingerprint)` - resigning
    necessarily changes a package's checksum (task rationale: a package
    signed under fingerprint C7C4 has a different sha256 than the same
    package signed under XXXX, so the same source RPM needs one cache row
    per fingerprint it's ever been resigned under, not one row total).

    This is an accelerating/idempotency cache, never a second source of
    truth for repository content - Pulp's own repository version content
    and a package's own `signing_keys` field remain authoritative (task
    rationale: "ne pas remplacer Pulp"). Not scoped to a single repository
    on purpose: the same upstream RPM (identical source_sha256) can appear
    in many repositories (e.g. mirrored into several distros/versions), and
    a resign done for one repository is immediately reusable by every other
    one that references the same bytes - no repository foreign key needed
    or wanted here.
    """

    __tablename__ = "rpm_signing_cache"
    __table_args__ = (
        UniqueConstraint("source_sha256", "fingerprint", name="uq_rpm_signing_cache_source_fingerprint"),
    )

    source_sha256: Mapped[str] = mapped_column(String(64), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64), index=True)
    # The exact content unit href resigning started from - kept mainly for
    # diagnostics (which upstream unit produced this cache row), not read
    # back to make a decision.
    source_content_href: Mapped[str | None] = mapped_column(String(512), nullable=True)
    signed_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    signed_content_href: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[RpmSigningCacheStatus] = mapped_column(
        String(16), default=RpmSigningCacheStatus.RUNNING, index=True
    )
    signed_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)


class RepositorySigningSyncState(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """One row per RPM repository: the highest Pulp repository version
    number whose added content has already been evaluated/resigned by
    `resign_repository_packages_job` (jobs.py). Lets both the post-sync
    delta detector (`detect_repository_content_changes_job`) and
    `apply_signing_to_all_repositories_job` ask "does this repository have
    any content I haven't looked at yet" in one indexed lookup instead of
    re-listing/re-checking every package on every run.

    Deliberately NOT fingerprint-scoped: it tracks "content as of version N
    has been checked against whichever fingerprint was active when that
    check ran", not "content is signed with fingerprint X". A key rotation
    always drives a fresh full pass through `resign_repository_packages_job`
    (see `publish_key_job`/`apply_signing_to_all_repositories_job`, which
    never pass `since_version`) before this row is ever advanced again, so
    the watermark stays meaningful across rotations without needing a
    second column - see docs/signing.md "Incremental resigning after sync".
    Only ever advanced when a resign run for the covered version range
    finishes with zero failures (jobs.py `_advance_sync_state`), so a
    partially-failed run is retried on the same range next time rather than
    silently being considered caught up.
    """

    __tablename__ = "signing_repository_sync_state"

    repository_href: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    last_processed_version: Mapped[int] = mapped_column(Integer, default=0)
