"""Pydantic request/response models for the LDAP settings API.

`LdapSettingsRead` never has a field for the raw bind password - only
`bind_password_is_set` - same write-only convention as
DefaultSettingsRead.proxy_password_is_set (pulpit-core/app/modules/
default_settings/schemas.py). There is no "read back the real password"
endpoint for this module (unlike default_settings' `/proxy-credentials`):
nothing in the browser ever needs the decrypted value - only
jobs.py's own apply/test-connection jobs do, and they read the DB row
directly."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.modules.ldap.models import LdapGroupType


class LdapSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    enabled: bool
    server_uri: str
    bind_dn: str
    bind_password_is_set: bool
    start_tls: bool
    user_search_base: str
    user_search_filter: str
    group_search_base: str
    group_search_filter: str
    group_type: LdapGroupType
    require_group_dn: str | None
    mirror_groups: bool
    attr_first_name: str
    attr_last_name: str
    attr_email: str
    updated_at: datetime


class LdapSettingsUpdate(BaseModel):
    """PATCH semantics - a field left out of the request body is left
    unchanged. `bind_password` is the exception to "unset means unchanged":
    omitted leaves the stored value as-is, `""` clears it, any other value
    replaces it - same three-state convention as
    DefaultSettingsUpdate.proxy_password. `require_group_dn` uses the same
    convention for clearing it back to "no group required"."""

    enabled: bool | None = None
    server_uri: str | None = None
    bind_dn: str | None = None
    bind_password: str | None = None
    start_tls: bool | None = None
    user_search_base: str | None = None
    user_search_filter: str | None = None
    group_search_base: str | None = None
    group_search_filter: str | None = None
    group_type: LdapGroupType | None = None
    require_group_dn: str | None = None
    mirror_groups: bool | None = None
    attr_first_name: str | None = None
    attr_last_name: str | None = None
    attr_email: str | None = None


class LdapTestConnectionRequest(BaseModel):
    """Tests against whatever is currently in the form, not necessarily what
    was last saved - every field is optional and falls back to the saved
    row (service.build_test_settings), same reasoning a "test before you
    save a possibly-broken config" action needs. `bind_password` omitted
    means "use the already-saved one" (never a blank-clears-it convention
    here - there is nothing to save, so no reason to support clearing it)."""

    server_uri: str | None = None
    bind_dn: str | None = None
    bind_password: str | None = None
    start_tls: bool | None = None
    user_search_base: str | None = None
    user_search_filter: str | None = None
