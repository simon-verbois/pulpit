"""Central configuration for pulpit-core and pulpit-worker.

Both processes import this module so they share one definition of "what
pulpit-core needs to know" - see docs/adr/0006-pulpit-core-backend.md for why
these two processes exist and what each one is (and is not) allowed to touch.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PULPIT_CORE_", extra="ignore")

    # --- Generic infrastructure -------------------------------------------------
    # Embedded SQLite by default (docs/adr/0007-merged-pulpit-container.md) -
    # no separate DB container/service needed. Every model uses only
    # dialect-generic SQLAlchemy types (sqlalchemy.Uuid/JSON, never the
    # Postgres-only postgresql.UUID/JSONB - VERIFIED round-trip identically
    # on both) specifically so this default and a real Postgres URL both
    # work unchanged. Never Pulp's own database either way - see ADR 0006.
    database_url: str = Field(
        default="sqlite:////var/lib/pulpit/pulpit-core.db",
        description="pulpit-core's OWN database. Never Pulp's - see ADR 0006.",
    )
    log_level: str = "INFO"

    # --- Secrets at rest (app/core/crypto.py) ---------------------------------
    # A Fernet key (Fernet.generate_key()), NOT a free-form passphrase -
    # encrypts values pulpit-core itself must store and later decrypt
    # (currently just default_settings.proxy_password_encrypted). Distinct
    # from Pulp's own PULP_SECRET_KEY (compose.yml) - never shared across
    # the two systems' trust boundaries (ADR 0006). Empty by default so a
    # deployment that never uses an encrypted-at-rest field doesn't need to
    # set it; app/core/crypto.py raises a clear error the moment one
    # actually is.
    secret_key: str = ""

    # --- Job worker ---------------------------------------------------------
    job_poll_interval_seconds: float = 2.0
    job_max_attempts: int = 3

    # --- Pulp adapter ---------------------------------------------------------
    # Same-origin, container-network address of the `pulp` service (not the
    # public nginx-fronted origin) - pulpit-core talks to Pulp server-to-server.
    pulp_base_url: str = "http://pulp:80"
    pulp_api_base_path: str = "/pulp/api/v3"
    # Service-account style credentials pulpit-core/worker use to call Pulp's
    # API on their own behalf (repository signing-field updates, signing
    # service lookups). Distinct from the interactive user's own session,
    # which is only used to authenticate the *caller of pulpit-core's* API -
    # see app/core/auth.py.
    pulp_service_username: str = "admin"
    pulp_service_password: str = ""
    pulp_request_timeout_seconds: float = 30.0

    # --- Signing module: identity defaults (all administrator-overridable at
    # runtime via the signing settings API/GUI - these are only the seed
    # values used the first time settings are created). Never treat these as
    # hardcoded organizational identity; see docs/signing.md.
    signing_default_key_name: str = "Pulp Repository Signing Key"
    signing_default_identity_name: str = "Pulp Repository Signing Key"
    signing_default_identity_email: str = ""
    signing_default_algorithm: str = "rsa4096"
    signing_default_validity_days: int = 730  # 2 years
    signing_default_public_key_filename: str = "RPM-GPG-KEY-pulp"
    signing_default_rpm_service_name: str = "Pulp RPM Signing Service"
    signing_default_metadata_service_name: str = "Pulp Metadata Signing Service"

    # --- Signing module: GPG backend (pulpit-worker only - see
    # app/modules/signing/gpg_local.py; pulpit-core's API process never reads
    # this directory and should not have it mounted at all). ---
    signing_gnupg_home: Path = Path("/var/lib/pulpit-signing/gnupg")
    signing_scripts_dir: Path = Path("/var/lib/pulpit-signing/scripts")
    # Filename (under signing_scripts_dir, already shared with `pulp` -
    # docs/signing.md "Shared volume permissions") of the desired-state
    # manifest `signing.check_pulp_bootstrap` writes and the colocated
    # reconciler baked into the derived Pulp image
    # (deployment/docker/pulp/pulpit-signing-reconciler) polls from inside
    # the `pulp` container - see docs/adr/0008-colocated-signing-reconciler.md.
    signing_manifest_filename: str = "signing-services.json"

    # --- Public key distribution ---------------------------------------------
    public_key_url_prefix: str = "/keys"

    # --- Fixture seed module (app/modules/fixture_seed/) ------------------------
    # Defaults to False: opt-in only, since enabling it makes outbound HTTP
    # calls to eight public fixture hosts using the privileged
    # pulp_service_username/password above. Set
    # PULPIT_CORE_FIXTURE_SEED_ENABLED=true to seed sample content on first
    # boot (see docs/DEPLOYMENT.md).
    fixture_seed_enabled: bool = False

    # --- LDAP module (app/modules/ldap/) -----------------------------------------
    # Filename, under the SAME signing_scripts_dir above (already shared
    # read-write with `pulpit`/read-only with `pulp` - no separate volume
    # needed), of the desired-state manifest `ldap.apply_config_job` writes
    # and the colocated reconciler baked into the derived Pulp image
    # (deployment/docker/pulp/pulpit-ldap-reconciler) polls from inside the
    # `pulp` container - same "write a manifest, a reconciler inside `pulp`
    # acts on it" architecture as signing (docs/adr/0008), just applied to
    # Django's own AUTHENTICATION_BACKENDS/AUTH_LDAP_* settings instead of a
    # Pulp SigningService.
    ldap_manifest_filename: str = "ldap-config.json"

    # --- LDAP module: test-connection (pulpit-worker only) -----------------------
    # Must stay an int: ldap3.Connection(receive_timeout=...) hands this
    # straight to struct.pack('LL', receive_timeout, 0) (ldap3/strategy/
    # base.py) with no int() coercion of its own - a float here raises
    # "struct.error: required argument is not an integer" the moment Test
    # connection is clicked, not a config problem on the LDAP server's side.
    ldap_test_connection_timeout_seconds: int = 10

    # --- TLS module (app/modules/tls/) -------------------------------------------
    # Where the certificate/key nginx's 8443 server block reads live -
    # deployment/docker/pulpit/entrypoint.sh mounts this as its own volume
    # (distinct sensitivity/lifecycle from signing_gnupg_home or the embedded
    # SQLite database). A self-signed fallback is generated automatically on
    # first boot if no manually imported certificate is present.
    tls_cert_dir: Path = Path("/var/lib/pulpit-tls")
    # Both the Overview-page warning and the TLS admin tab use this same
    # threshold - never hardcoded twice on the frontend, it's part of the
    # GET /tls/active response.
    tls_warn_days: int = 30
    tls_selfsigned_validity_days: int = 730
    tls_selfsigned_common_name: str = "pulpit.local"

    # --- Health check (app/api/health.py) ----------------------------------------
    # Deliberately much shorter than pulp_request_timeout_seconds above: a
    # monitoring probe hitting /health should fail fast on an unreachable
    # Pulp rather than hang for as long as a real, patient signing/resigning
    # job would tolerate.
    health_check_pulp_timeout_seconds: float = 5.0
    # A scheduled heartbeat exists in every module (the fastest currently
    # registered is signing.rotation_check, every 300s) - if no job has
    # finished in three times that long, the worker loop is most likely
    # stuck or not running at all, not just "between ticks".
    health_check_worker_stale_after_seconds: float = 900.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
