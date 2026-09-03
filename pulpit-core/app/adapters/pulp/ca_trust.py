"""Builds the shell script that reconciles Pulp's OCI-image CA trust store
with pulpit-core's own `trusted_ca` module (app/modules/trusted_ca/jobs.py).

Per Pulp's own docs ("Certificate injection in Pulp containers",
pulpproject.org/pulp-oci-images), the only supported mechanism for trusting
a custom/self-signed CA in the `pulp/pulp` image is copying a `.crt` file
into `/etc/pki/ca-trust/source/anchors/` and running `update-ca-trust` -
there is no environment variable (`SSL_CERT_FILE`/`REQUESTS_CA_BUNDLE`
etc.) pulpcore reads instead. This module turns that into a script run via
`PulpCommandExecutor.run_shell` (executor.py).
"""

import base64
import re

ANCHOR_DIR = "/etc/pki/ca-trust/source/anchors"
_UNSAFE_NAME_CHARS = re.compile(r"[^A-Za-z0-9_-]")


def anchor_filename(name: str) -> str:
    """Every pulpit-managed file is prefixed "pulpit-" so the reconcile
    script (below) only ever touches certificates it manages itself, never
    something an administrator (or the base image) already placed in this
    directory directly. `name` is validated to already be safe
    (schemas.py's `_NAME_PATTERN`) by the time this is called; the
    substitution here is defense in depth, not the primary guard."""
    return f"pulpit-{_UNSAFE_NAME_CHARS.sub('_', name)}.crt"


def build_sync_script(certs: list[tuple[str, str]]) -> str:
    """`certs` is the CURRENT full set of (name, pem) pairs, not a diff:
    every previously-written pulpit-managed file is removed first, so a
    certificate deleted from pulpit-core's own table is actually removed
    from Pulp's trust store on the next sync, not just no-longer-added.

    Each PEM is base64-encoded before being embedded in the script - it's
    the certificate's own content (arbitrary line breaks, `-----BEGIN...`
    banners), never shell-interpreted, and base64 output is plain-ASCII
    alnum/+//=, safe to inline in a POSIX shell heredoc-free `echo` without
    further quoting.
    """
    lines = ["set -e", f"rm -f {ANCHOR_DIR}/pulpit-*.crt"]
    for name, pem in certs:
        encoded = base64.b64encode(pem.encode()).decode()
        lines.append(f"echo {encoded} | base64 -d > {ANCHOR_DIR}/{anchor_filename(name)}")
    lines.append("update-ca-trust")
    return "\n".join(lines)
