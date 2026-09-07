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
    # Defaults to True to preserve the "new instance isn't a totally empty
    # shell" onboarding UX ADR 0011 was written for. A production deployment
    # with restricted/metered egress may not want its very first boot making
    # outbound HTTP calls (using the privileged pulp_service_username/password
    # above) to eight public fixture hosts (fixtures.pulpproject.org,
    # nginx.org, registry-1.docker.io, galaxy.ansible.com, pypi.org,
    # index.rubygems.org, repo1.maven.org, huggingface.co) with no prior
    # opt-in - set PULPIT_CORE_FIXTURE_SEED_ENABLED=false there (see
    # docs/DEPLOYMENT.md). Checked once at process/worker startup
    # (fixture_seed/module.py's `scheduled_jobs`), not re-read per request.
    fixture_seed_enabled: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
