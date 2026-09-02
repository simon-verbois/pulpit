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
    database_url: str = Field(
        default="postgresql+psycopg://pulpit_core:pulpit_core@pulpit-core-db:5432/pulpit_core",
        description="pulpit-core's OWN database. Never Pulp's - see ADR 0006.",
    )
    log_level: str = "INFO"

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

    # --- Public key distribution ---------------------------------------------
    public_key_url_prefix: str = "/keys"

    # --- Automating the one manual Pulp step (app/adapters/pulp/executor.py,
    # docs/signing.md "Automating the manual Pulp step") - unset (default) by
    # design: this project's reference Compose deployment sets it, but a
    # deployment that isn't Docker at all (or doesn't want to grant this)
    # leaves it unset and gets the pre-existing manual-command flow
    # unchanged, never a hard failure. pulpit-worker only - pulpit-core's API
    # process never imports app.adapters.pulp.executor.
    pulp_executor_docker_host: str = ""
    pulp_executor_container_label: str = "com.docker.compose.service=pulp"


@lru_cache
def get_settings() -> Settings:
    return Settings()
