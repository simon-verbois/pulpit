"""Job handlers for the LDAP module.

`apply_config_job` writes the manifest (manifest.py) the colocated
reconciler polls, then waits for and reports on Pulp's API process coming
back up afterward - see its own docstring for exactly what this can and
can't verify. `test_connection_job` never touches Pulp/the manifest at
all: it's a direct LDAP bind+search check from pulpit-worker itself
(ldap3), the one part of this module that talks LDAP directly rather than
through Pulp's own django-auth-ldap."""

import logging
import time

import ldap3
from sqlalchemy.orm import Session

from app.adapters.pulp import PulpAdapterError, get_pulp_client
from app.core.config import get_settings
from app.core.jobs.registry import job_registry
from app.modules.ldap import service
from app.modules.ldap.manifest import build_manifest, write_manifest
from app.modules.ldap.models import LdapSettings

APPLY_JOB_TYPE = "ldap.apply_config"
TEST_CONNECTION_JOB_TYPE = "ldap.test_connection"

logger = logging.getLogger(__name__)

# The reconciler polls every 30s (deployment/docker/pulp/pulpit-ldap-reconciler's
# own POLL_INTERVAL_SECONDS) - give it one full cycle plus margin for
# rendering the settings file and restarting pulpcore-api before starting to
# check, then keep checking for a while in case the restart itself is just
# slow (a cold Django import, not a sign anything is wrong).
_HEALTH_CHECK_INITIAL_DELAY_SECONDS = 35
_HEALTH_CHECK_RETRY_SECONDS = 3
_HEALTH_CHECK_TIMEOUT_SECONDS = 30


def apply_config_job(db: Session, _payload: dict) -> dict:
    """Pushes the currently-saved LdapSettings row out to Pulp and reports
    whether Pulp's API process came back up healthy afterward.

    This can only confirm the mechanical part: the manifest was written,
    the reconciler picked it up, rendered new Django settings, and
    restarted pulpcore-api without that process failing to come back up at
    all (e.g. a bug in this module's own settings-rendering code). It
    CANNOT confirm the LDAP config itself actually works (wrong bind
    credentials, an unreachable server, a bad search base) - Django has no
    API of its own to introspect AUTHENTICATION_BACKENDS/AUTH_LDAP_* from
    the outside, unlike a Pulp object (unrelated PulpAdapterError this
    module never verifies against Pulp's actual objects, since there is no
    such object). Use "Test connection" (test_connection_job) beforehand to
    catch those - it binds against the real server directly."""
    settings = get_settings()
    row = service.get_settings_row(db)
    manifest = build_manifest(row)
    write_manifest(
        manifest,
        manifest_path=str(settings.signing_scripts_dir / settings.ldap_manifest_filename),
    )

    time.sleep(_HEALTH_CHECK_INITIAL_DELAY_SECONDS)

    client = get_pulp_client()
    deadline = time.monotonic() + _HEALTH_CHECK_TIMEOUT_SECONDS
    last_error: str | None = None
    while True:
        try:
            client.get_status()
            return {"manifest_written": True, "pulp_api_healthy": True}
        except PulpAdapterError as exc:
            last_error = str(exc)
        if time.monotonic() > deadline:
            break
        time.sleep(_HEALTH_CHECK_RETRY_SECONDS)

    logger.warning("Pulp's API did not come back up healthy after an LDAP config apply: %s", last_error)
    return {"manifest_written": True, "pulp_api_healthy": False, "error": last_error}


def _build_test_server(row_or_settings: LdapSettings, overrides: dict) -> tuple:
    resolved = service.resolve_test_settings(row_or_settings, overrides)
    server = ldap3.Server(resolved.server_uri, use_ssl=resolved.server_uri.startswith("ldaps://"))
    return resolved, server


def test_connection_job(db: Session, payload: dict) -> dict:
    """Direct LDAP bind + (if a search base is configured) one user search -
    everything "Test connection" in the UI can check without ever touching
    Pulp. Runs as a job, not inline in the request, same "never let a
    request block on an external network call" convention as every other
    outbound-network job in this codebase (e.g. fixture_seed)."""
    row = service.get_settings_row(db)
    # `payload` is already exactly LdapTestConnectionRequest's own
    # exclude_unset dump (routes/test_connection.py) - the field names match
    # 1:1, no need to re-validate a second time here.
    resolved, server = _build_test_server(row, payload)

    if not resolved.server_uri:
        return {"success": False, "error": "No LDAP server URI configured."}

    timeout = get_settings().ldap_test_connection_timeout_seconds
    try:
        connection = ldap3.Connection(
            server,
            user=resolved.bind_dn or None,
            password=resolved.bind_password or None,
            auto_bind=False,
            receive_timeout=timeout,
        )
        if resolved.start_tls:
            connection.open()
            if not connection.start_tls():
                return {"success": False, "error": "STARTTLS negotiation failed."}
        if not connection.bind():
            return {
                "success": False,
                "error": f"Bind failed: {connection.result.get('description', 'unknown error')}",
            }
    except ldap3.core.exceptions.LDAPException as exc:
        return {"success": False, "error": f"Could not connect: {exc}"}

    try:
        result: dict = {"success": True, "bound_as": resolved.bind_dn or "(anonymous)"}

        if resolved.user_search_base:
            try:
                # A harmless probe search (never binds as anything found) just
                # to confirm the search base/filter combination returns
                # something - %(user)s is django-auth-ldap's own placeholder,
                # meaningless to a raw LDAP filter, so swap in a wildcard for
                # this check only.
                probe_filter = (
                    resolved.user_search_filter.replace("%(user)s", "*") or "(objectClass=*)"
                )
                connection.search(
                    resolved.user_search_base,
                    probe_filter,
                    search_scope=ldap3.SUBTREE,
                    size_limit=1,
                )
                result["user_search_matched"] = len(connection.entries) > 0
            except ldap3.core.exceptions.LDAPException as exc:
                result["user_search_error"] = str(exc)

        return result
    finally:
        connection.unbind()


def register() -> None:
    job_registry.register(APPLY_JOB_TYPE, apply_config_job)
    job_registry.register(TEST_CONNECTION_JOB_TYPE, test_connection_job)
