"""Pure helpers for the remote connectivity probe (no Django imports).

Kept separate from the view so the URL/permission/result logic can be unit
tested without a running Pulp.
"""

# Pulp remote TYPE -> the view permission a user needs on that remote.
VIEW_PERMISSIONS = {
    "rpm": "rpm.view_rpmremote",
    "uln": "rpm.view_ulnremote",
}


def probe_url(remote_url):
    """The metadata index every yum/dnf repository (and ULN channel) serves.

    Fetching it is exactly what a sync does first, so a successful fetch
    proves the server URL, credentials (ULN login), channel/path, proxy and
    TLS settings are all usable. ULN URLs (uln://<channel>) are rewritten to
    the ULN server by pulp_rpm's own UlnDownloader, not here.
    """
    return remote_url.rstrip("/") + "/repodata/repomd.xml"


def looks_like_repomd(head):
    """True when the downloaded bytes are a repomd.xml, not e.g. a login page."""
    return b"<repomd" in head


def failure_detail(exc):
    """A short, user-facing message for a probe exception."""
    # Matched by name: pulp_rpm raises it as UlnCredentialsError(msg), which
    # (legacy PulpException constructor) overwrites its error_code with msg.
    if type(exc).__name__ == "UlnCredentialsError":
        return "ULN login failed - check the ULN username/password and server base URL."
    status = getattr(exc, "status", None)
    message = getattr(exc, "message", None) or str(exc) or type(exc).__name__
    if status == 401 or status == 403:
        return f"Authentication refused by the server (HTTP {status})."
    if status == 404:
        return "Repository metadata not found (HTTP 404) - check the URL / channel label."
    if status is not None:
        return f"HTTP {status}: {message}"
    return message
