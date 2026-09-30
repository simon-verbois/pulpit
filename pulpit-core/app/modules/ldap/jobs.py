"""Job handlers for the LDAP module.

`apply_config_job` writes the manifest (manifest.py) the colocated
reconciler polls, then waits for and reports on Pulp's API process coming
back up afterward - see its own docstring for exactly what this can and
can't verify. `test_connection_job` never touches Pulp/the manifest at
all: it's a direct LDAP bind+search check from pulpit-worker itself
(ldap3), the one part of this module that talks LDAP directly rather than
through Pulp's own django-auth-ldap."""

import logging
import socket
import ssl
import time
from dataclasses import dataclass

import ldap3
from ldap3.core.results import (
    RESULT_INSUFFICIENT_ACCESS_RIGHTS,
    RESULT_INVALID_DN_SYNTAX,
    RESULT_NO_SUCH_OBJECT,
    RESULT_SUCCESS,
)
from sqlalchemy.orm import Session

from app.adapters.pulp import PulpAdapterError, get_pulp_client
from app.core.config import get_settings
from app.core.jobs.registry import job_registry
from app.modules.ldap import service
from app.modules.ldap.manifest import build_manifest, write_manifest
from app.modules.ldap.models import LdapSettings
from app.modules.ldap.service import ResolvedTestSettings

APPLY_JOB_TYPE = "ldap.apply_config"
TEST_CONNECTION_JOB_TYPE = "ldap.test_connection"

_VALID_SERVER_URI_SCHEMES = ("ldap://", "ldaps://")

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
    db.commit()
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


def _classify_connection_error(exc: Exception) -> str:
    """ldap3 wraps every socket/TLS failure it hits while opening a
    connection or negotiating STARTTLS in a dynamically-generated exception
    class that multiply-inherits from both an LDAPException and the real
    underlying stdlib exception (communication_exception_factory /
    start_tls_exception_factory in ldap3/core/exceptions.py) - isinstance
    against the stdlib types below is what lets a single `except
    LDAPException` still tell TCP/TLS failures apart, instead of collapsing
    all of them into one generic "Could not connect" message.

    DNS is the one case that ISN'T reachable this way (VERIFIED against a
    real, running instance - see the LDAP audit): ldap3.Server's own
    address_info property (ldap3/core/server.py) catches socket.gaierror
    itself and just returns no candidate addresses, so the exception that
    actually surfaces here is a plain, non-multiply-inherited
    LDAPSocketOpenError('invalid server address') - matched on its message
    instead, since there is no stdlib DNS exception left to isinstance
    against by the time it gets here."""
    if isinstance(exc, ldap3.core.exceptions.LDAPSocketOpenError) and "invalid server address" in str(exc):
        return f"Could not resolve the server address (DNS lookup failed, or the hostname/IP is invalid): {exc}"
    if isinstance(exc, ldap3.core.exceptions.LDAPCertificateError):
        return f"TLS certificate error (hostname mismatch): {exc}"
    if isinstance(exc, ssl.SSLCertVerificationError):
        return f"TLS certificate could not be verified (check the CA/certificate configuration): {exc}"
    if isinstance(exc, ssl.SSLError):
        return f"TLS/SSL negotiation failed: {exc}"
    if isinstance(exc, socket.gaierror):
        return f"DNS resolution failed for the server URI: {exc}"
    if isinstance(exc, ConnectionRefusedError):
        return f"TCP connection refused by the server (wrong port, or nothing listening): {exc}"
    if isinstance(exc, TimeoutError):
        return f"Connection timed out (server unreachable, or a firewall is dropping traffic): {exc}"
    if isinstance(exc, OSError):
        return f"Network error while connecting: {exc}"
    if not isinstance(exc, ldap3.core.exceptions.LDAPException):
        # VERIFIED against a real, running instance (see the LDAP audit): a
        # reachable TCP port that isn't actually speaking LDAP (e.g. the
        # wrong port number pointed at an HTTP service) makes ldap3's BER
        # decoder choke while parsing the bind response, raising a bare
        # KeyError - not any LDAPException subtype at all, and with a
        # useless message (just the raw ASN.1 tag tuple, e.g. "(1, 20)").
        return (
            "The server did not respond with anything resembling a valid "
            f"LDAP protocol message - check the URI/port actually points at "
            f"an LDAP service: {exc}"
        )
    return f"Could not connect: {exc}"


def _describe_search_result_error(result: dict) -> str:
    code = result.get("result")
    description = result.get("description") or "unknown error"
    if code == RESULT_NO_SUCH_OBJECT:
        return f"Search base does not exist on the server: {description}"
    if code == RESULT_INSUFFICIENT_ACCESS_RIGHTS:
        return f"The bind account has insufficient permissions to search there: {description}"
    if code == RESULT_INVALID_DN_SYNTAX:
        return f"Invalid DN syntax: {description}"
    return f"Search failed: {description}"


@dataclass
class _SearchProbeResult:
    matched: bool
    error: str | None


def _probe_search(
    connection: ldap3.Connection, search_base: str, search_filter: str, search_scope: str
) -> _SearchProbeResult:
    """A harmless probe search (never binds as anything found) to confirm a
    search base/filter combination is actually usable. ldap3's own
    `connection.search()` return value only distinguishes "matched at least
    one entry" from "didn't" (raise_exceptions defaults to False) - a bad
    search base, an unreadable one, or a malformed filter all come back as
    the same `False`/empty-entries result as "zero real matches, config is
    fine". Checking `connection.result['result']` (the actual LDAP result
    code) instead is what tells those apart."""
    try:
        connection.search(search_base, search_filter, search_scope=search_scope, size_limit=1)
    except ldap3.core.exceptions.LDAPException as exc:
        return _SearchProbeResult(matched=False, error=f"Invalid search filter: {exc}")
    except Exception as exc:  # see test_connection_job's own except clause for why this is broad
        return _SearchProbeResult(matched=False, error=_classify_connection_error(exc))
    result_code = connection.result.get("result")
    if result_code not in (None, RESULT_SUCCESS):
        return _SearchProbeResult(
            matched=False, error=_describe_search_result_error(connection.result)
        )
    return _SearchProbeResult(matched=len(connection.entries) > 0, error=None)


def _build_test_server(
    row_or_settings: LdapSettings, overrides: dict
) -> tuple[ResolvedTestSettings, ldap3.Server]:
    resolved = service.resolve_test_settings(row_or_settings, overrides)
    # Must be an int: ldap3.Connection(receive_timeout=...) (test_connection_job
    # below) passes the same setting straight to struct.pack('LL', ...) with
    # no coercion of its own - a float raises struct.error the moment a
    # connection is made. connect_timeout itself tolerates a float (plain
    # socket.settimeout), but it shares the one setting with receive_timeout,
    # so both are cast here for consistency.
    timeout = int(get_settings().ldap_test_connection_timeout_seconds)
    server = ldap3.Server(
        resolved.server_uri,
        use_ssl=resolved.server_uri.startswith("ldaps://"),
        # ca_certs_data=None keeps ldap3's default: the system trust store.
        tls=ldap3.Tls(validate=ssl.CERT_REQUIRED, ca_certs_data=resolved.ca_cert),
        connect_timeout=timeout,
    )
    return resolved, server


def test_connection_job(db: Session, payload: dict) -> dict:
    """Direct LDAP bind + (if configured) user/group search probes and a
    Require group DN existence check - everything "Test connection" in the
    UI can check without ever touching Pulp. Runs as a job, not inline in
    the request, same "never let a request block on an external network
    call" convention as every other outbound-network job in this codebase
    (e.g. fixture_seed)."""
    row = service.get_settings_row(db)
    db.commit()
    # `payload` is already exactly LdapTestConnectionRequest's own
    # exclude_unset dump (routes/test_connection.py) - the field names match
    # 1:1, no need to re-validate a second time here.
    resolved, server = _build_test_server(row, payload)

    if not resolved.server_uri:
        return {"success": False, "error": "No LDAP server URI configured."}
    if not resolved.server_uri.startswith(_VALID_SERVER_URI_SCHEMES):
        return {
            "success": False,
            "error": f"Server URI must start with ldap:// or ldaps:// (got {resolved.server_uri!r}).",
        }
    is_ldaps = resolved.server_uri.startswith("ldaps://")
    if is_ldaps and resolved.start_tls:
        return {
            "success": False,
            "error": (
                "STARTTLS cannot be combined with an ldaps:// URI - they are "
                "two different ways of getting an encrypted connection, and "
                "the second silently overrides the first. Use ldap:// with "
                "STARTTLS enabled, or ldaps:// with STARTTLS disabled."
            ),
        }
    if resolved.bind_dn and not resolved.bind_password:
        return {
            "success": False,
            "error": (
                "A Bind DN is set but no bind password was provided. Per "
                "RFC 4513, a simple bind with a DN and an empty password is "
                "an 'unauthenticated bind', which can succeed without the "
                "server actually checking credentials - this would make the "
                "test misleadingly report success. Provide a bind password, "
                "or clear the Bind DN to test an anonymous bind instead."
            ),
        }

    timeout = int(get_settings().ldap_test_connection_timeout_seconds)
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
    except Exception as exc:
        # Deliberately broader than `except LDAPException`: a reachable port
        # that isn't actually an LDAP service can make ldap3's BER decoder
        # raise a bare KeyError while parsing the bind response (VERIFIED
        # against a real, running instance - see _classify_connection_error's
        # own docstring) - this whole block only ever calls into ldap3
        # (an external boundary), so there is no risk of masking a bug in
        # this codebase's own logic by catching broadly here.
        return {"success": False, "error": _classify_connection_error(exc)}

    try:
        result: dict = {"success": True, "bound_as": resolved.bind_dn or "(anonymous)"}

        if resolved.user_search_base:
            # %(user)s is django-auth-ldap's own placeholder, meaningless to
            # a raw LDAP filter, so swap in a wildcard for this check only.
            probe_filter = (
                resolved.user_search_filter.replace("%(user)s", "*") or "(objectClass=*)"
            )
            user_probe = _probe_search(
                connection, resolved.user_search_base, probe_filter, ldap3.SUBTREE
            )
            result["user_search_matched"] = user_probe.matched
            if user_probe.error:
                result["user_search_error"] = user_probe.error

        if resolved.group_search_base:
            group_probe = _probe_search(
                connection,
                resolved.group_search_base,
                resolved.group_search_filter or "(objectClass=*)",
                ldap3.SUBTREE,
            )
            result["group_search_matched"] = group_probe.matched
            if group_probe.error:
                result["group_search_error"] = group_probe.error

        if resolved.require_group_dn:
            require_group_probe = _probe_search(
                connection, resolved.require_group_dn, "(objectClass=*)", ldap3.BASE
            )
            result["require_group_dn_exists"] = require_group_probe.matched
            if require_group_probe.error:
                result["require_group_dn_error"] = require_group_probe.error

        return result
    finally:
        connection.unbind()


def register() -> None:
    job_registry.register(APPLY_JOB_TYPE, apply_config_job)
    job_registry.register(TEST_CONNECTION_JOB_TYPE, test_connection_job)
