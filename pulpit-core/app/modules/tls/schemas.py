"""Pydantic request/response models for the tls API.

None of these types has a field for private key material - by construction,
not by convention: tls_certificates (models.py) has no such column, only
metadata; the key itself only ever exists on disk. The one exception is
ManualCertificateUploadRequest.key_pem, which necessarily carries the
uploaded key from the browser to the route handler - see manual.py's
docstring for why that path is applied synchronously, never through a
persisted job payload.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.tls.models import TlsCertSource


class TlsCertificateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source: TlsCertSource
    subject: str
    fingerprint_sha256: str
    not_before: datetime
    not_after: datetime
    created_at: datetime
    freeipa_principal: str | None = None


class TlsActiveCertificateRead(TlsCertificateRead):
    days_until_expiry: int
    warn_days: int
    is_expiring_soon: bool


class TlsCertificateHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event: str
    source: TlsCertSource
    fingerprint_sha256: str
    not_after: datetime
    triggered_by: str
    notes: str
    created_at: datetime


class ManualCertificateUploadRequest(BaseModel):
    cert_pem: str = Field(min_length=1)
    key_pem: str = Field(min_length=1)


# --- FreeIPA provider -------------------------------------------------------


class TlsFreeIpaSettingsRead(BaseModel):
    """`service_password_is_set` only, never the raw value - same write-only
    convention as LdapSettingsRead.bind_password_is_set. Nothing in the
    browser ever needs the decrypted password; only jobs.py's own
    request/renew jobs do, and they read the DB row directly."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    enabled: bool
    base_url: str
    verify_tls: bool
    common_name: str
    service_principal: str
    service_username: str
    service_password_is_set: bool
    ca: str
    profile: str | None
    auto_renew_enabled: bool
    renew_before_days: int
    updated_at: datetime


class TlsFreeIpaSettingsUpdate(BaseModel):
    """PATCH semantics - a field left out of the request body is left
    unchanged. `service_password` is the exception: omitted leaves the
    stored value as-is, `""` clears it, any other value replaces it - same
    three-state convention as LdapSettingsUpdate.bind_password. `profile`
    uses the same convention for clearing it back to "use FreeIPA's own
    default profile"."""

    enabled: bool | None = None
    base_url: str | None = None
    verify_tls: bool | None = None
    common_name: str | None = None
    service_principal: str | None = None
    service_username: str | None = None
    service_password: str | None = None
    ca: str | None = None
    profile: str | None = None
    auto_renew_enabled: bool | None = None
    renew_before_days: int | None = Field(default=None, ge=1, le=3650)


class FreeIpaTestConnectionResult(BaseModel):
    success: bool
    error: str | None = None


class FreeIpaWizardSetupRequest(BaseModel):
    """`admin_password` is accepted ONLY for the duration of this one
    request - the wizard route (routes/freeipa.py) never persists it, never
    logs it, and never passes it into a job payload (a database table).
    Only the resulting service account's own credentials, created during
    this call, are saved into TlsFreeIpaSettings."""

    base_url: str = Field(min_length=1)
    verify_tls: bool = True
    admin_username: str = Field(min_length=1)
    admin_password: str = Field(min_length=1)
    common_name: str = Field(min_length=1, description="e.g. pulpit.example.com")
    target_principal: str = Field(
        min_length=1, description="e.g. HTTP/pulpit.example.com@EXAMPLE.COM"
    )
    service_account_username: str = Field(min_length=1, description="e.g. svc-pulpit-tls")
    ca: str = "ipa"
    profile: str | None = None
    renew_before_days: int = Field(default=30, ge=1, le=3650)


class FreeIpaWizardStepResult(BaseModel):
    step: str
    status: str  # "created" | "already_exists" | "failed"
    detail: str = ""


class FreeIpaWizardSetupResult(BaseModel):
    success: bool
    steps: list[FreeIpaWizardStepResult]
