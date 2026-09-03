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

from pydantic import BaseModel, ConfigDict


class DefaultSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    proxy_url: str
    proxy_username: str
    proxy_password_is_set: bool
    proxy_tls_validation: bool
    updated_at: datetime


class DefaultSettingsUpdate(BaseModel):
    """PATCH semantics - a field left out of the request body is left
    unchanged. `proxy_password` is the one exception to "unset means
    unchanged": omitted leaves the stored password as-is, `""` clears it,
    any other value replaces it (service.py's update_settings) - the same
    three-state convention the Create/Edit Remote modals already use for
    Pulp's own proxy_password field."""

    proxy_url: str | None = None
    proxy_username: str | None = None
    proxy_password: str | None = None
    proxy_tls_validation: bool | None = None


class ProxyCredentials(BaseModel):
    """The real, decrypted proxy settings - see this module's docstring on
    why this is a separate schema/endpoint from DefaultSettingsRead."""

    proxy_url: str
    proxy_username: str
    proxy_password: str | None
