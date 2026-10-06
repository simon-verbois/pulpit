"""Global outbound policy API models; proxy credentials are always write-only.

The private runtime manifest receives the decrypted credential server-side.
The retired credential-export endpoint returns HTTP 410.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.pem import validate_ca_cert_pem


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
        return validate_ca_cert_pem(value)
