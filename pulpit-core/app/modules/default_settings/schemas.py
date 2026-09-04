"""Pydantic request/response models for the default-settings API.

`DefaultSettingsRead` never has a field for the raw proxy password - only
`proxy_password_is_set` (whether one is configured) - matching Pulp's own
Remote.proxy_password handling (write-only, VERIFIED live: GET never
echoes it back, see src/components/RemoteConnectionSettingsFields.tsx on
the frontend). `ProxyCredentials` is the one deliberate exception: the
actual decrypted value, returned only by its own narrow endpoint
(routes/proxy_credentials.py), fetched only at the moment the frontend
needs to actually apply the default proxy to a new/edited Remote - never
by the general settings GET this page's own form uses to render itself.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


def _validate_ca_cert_pem(value: str) -> str:
    """Shared with the old trusted_ca module's TrustedCaCertificateCreate
    validator (now removed) - same PEM sanity check, just applied to this
    module's own `proxy_ca_cert` field instead."""
    stripped = value.strip()
    if "-----BEGIN CERTIFICATE-----" not in stripped:
        raise ValueError(
            "must be a PEM-encoded certificate, starting with -----BEGIN CERTIFICATE-----"
        )
    if "-----END CERTIFICATE-----" not in stripped:
        raise ValueError("PEM certificate is missing its -----END CERTIFICATE----- footer")
    return stripped


class DefaultSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    proxy_url: str
    proxy_username: str
    proxy_password_is_set: bool
    proxy_tls_validation: bool
    # Public material (see models.py's docstring) - returned in full, unlike
    # proxy_password_is_set above.
    proxy_ca_cert: str | None
    updated_at: datetime


class DefaultSettingsUpdate(BaseModel):
    """PATCH semantics - a field left out of the request body is left
    unchanged. `proxy_password` and `proxy_ca_cert` are the exceptions to
    "unset means unchanged": omitted leaves the stored value as-is, `""`
    clears it, any other value replaces it (service.py's update_settings) -
    the same three-state convention the Create/Edit Remote modals already
    use for Pulp's own proxy_password field."""

    proxy_url: str | None = None
    proxy_username: str | None = None
    proxy_password: str | None = None
    proxy_tls_validation: bool | None = None
    proxy_ca_cert: str | None = None

    @field_validator("proxy_ca_cert")
    @classmethod
    def _validate_proxy_ca_cert(cls, value: str | None) -> str | None:
        if not value:
            # "" (clear) or None (leave unchanged, service.py never sees
            # this branch since it checks `is not None` first) - nothing to
            # validate either way.
            return value
        return _validate_ca_cert_pem(value)


class ProxyCredentials(BaseModel):
    """The real, decrypted proxy settings - see this module's docstring on
    why this is a separate schema/endpoint from DefaultSettingsRead."""

    proxy_url: str
    proxy_username: str
    proxy_password: str | None
    proxy_ca_cert: str | None
