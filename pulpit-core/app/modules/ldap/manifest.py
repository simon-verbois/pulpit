"""Builds and atomically writes the desired-state manifest the colocated
LDAP reconciler (deployment/docker/pulp/pulpit-ldap-reconciler) polls from
inside the `pulp` container - same architecture as signing's own
pulp_bootstrap.py, just for Django's AUTHENTICATION_BACKENDS/AUTH_LDAP_*
settings instead of a Pulp SigningService (see docs/adr/0008-colocated-
signing-reconciler.md for the pattern this reuses).

Unlike signing's manifest (only ever entries for services still pending),
this one always reflects the FULL current desired state, `enabled: false`
included - the reconciler needs to know to actively remove LDAP from
AUTHENTICATION_BACKENDS when it's turned off, not just stop being told
about it."""

import json
import os
from pathlib import Path

from app.core.crypto import decrypt_secret
from app.modules.ldap.models import LdapSettings


def build_manifest(row: LdapSettings) -> dict:
    if not row.enabled:
        return {"enabled": False}

    return {
        "enabled": True,
        "server_uri": row.server_uri,
        "bind_dn": row.bind_dn,
        "bind_password": (
            decrypt_secret(row.bind_password_encrypted)
            if row.bind_password_encrypted is not None
            else None
        ),
        "start_tls": row.start_tls,
        "user_search_base": row.user_search_base,
        "user_search_filter": row.user_search_filter,
        "group_search_base": row.group_search_base,
        "group_search_filter": row.group_search_filter,
        "group_type": row.group_type,
        "require_group_dn": row.require_group_dn,
        "mirror_groups": row.mirror_groups,
        "attr_first_name": row.attr_first_name,
        "attr_last_name": row.attr_last_name,
        "attr_email": row.attr_email,
    }


def write_manifest(manifest: dict, *, manifest_path: str) -> None:
    """Atomically replaces the manifest file - writes to a temp file in the
    same directory, then `os.replace` (atomic on a single filesystem, which
    a bind-mounted/named volume always is here) so the reconciler never
    observes a half-written file. Same approach as signing's
    write_signing_services_manifest."""
    path = Path(manifest_path)
    tmp_path = path.with_name(f"{path.name}.tmp")
    tmp_path.write_text(json.dumps(manifest, indent=2))
    os.chmod(tmp_path, 0o600)  # contains a plaintext bind password
    os.replace(tmp_path, path)
