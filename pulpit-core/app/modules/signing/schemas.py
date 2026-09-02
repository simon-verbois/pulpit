"""Pydantic request/response models for the signing API.

None of these types has a field for private key material, a passphrase, or
raw GNUPGHOME contents - by construction, not by convention: there is no
column in signing_keys (models.py) holding any of that in the first place,
so there is nothing sensitive an API response could accidentally include
(task section 4/15: "no private key ... returned by the API").
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.signing.models import KeyState

_VALID_ALGORITHMS = {"rsa2048", "rsa3072", "rsa4096", "ed25519"}


class SigningSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    signing_enabled: bool
    package_signing_enabled: bool
    metadata_signing_enabled: bool
    key_name: str
    identity_name: str
    identity_email: str
    algorithm: str
    validity_days: int
    public_key_filename: str
    rpm_signing_service_name: str
    metadata_signing_service_name: str
    auto_rotation_enabled: bool
    rotation_generate_before_days: int
    rotation_activate_before_days: int
    key_retention_days: int
    allow_indefinite_validity: bool
    updated_at: datetime


class SigningSettingsUpdate(BaseModel):
    """All fields optional - PATCH semantics, only supplied fields change."""

    signing_enabled: bool | None = None
    package_signing_enabled: bool | None = None
    metadata_signing_enabled: bool | None = None
    key_name: str | None = Field(default=None, min_length=1, max_length=255)
    identity_name: str | None = Field(default=None, min_length=1, max_length=255)
    identity_email: str | None = Field(default=None, max_length=255)
    algorithm: str | None = None
    validity_days: int | None = Field(default=None, ge=1, le=3650)
    public_key_filename: str | None = Field(default=None, min_length=1, max_length=255)
    rpm_signing_service_name: str | None = Field(default=None, min_length=1, max_length=255)
    metadata_signing_service_name: str | None = Field(default=None, min_length=1, max_length=255)
    auto_rotation_enabled: bool | None = None
    rotation_generate_before_days: int | None = Field(default=None, ge=1, le=3650)
    rotation_activate_before_days: int | None = Field(default=None, ge=1, le=3650)
    key_retention_days: int | None = Field(default=None, ge=0, le=3650)
    allow_indefinite_validity: bool | None = None

    @field_validator("algorithm")
    @classmethod
    def _validate_algorithm(cls, value: str | None) -> str | None:
        if value is not None and value not in _VALID_ALGORITHMS:
            raise ValueError(f"algorithm must be one of {sorted(_VALID_ALGORITHMS)}")
        return value

    @field_validator("public_key_filename")
    @classmethod
    def _validate_filename(cls, value: str | None) -> str | None:
        if value is not None and ("/" in value or ".." in value or not value.strip()):
            raise ValueError("public_key_filename must be a bare filename, no path separators")
        return value


class SigningKeyRead(BaseModel):
    """Deliberately excludes anything private - see module docstring."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    state: KeyState
    key_id: str
    fingerprint: str
    identity_name: str
    identity_email: str
    algorithm: str
    generated_by: str
    created_at: datetime
    activated_at: datetime | None
    expires_at: datetime | None
    retiring_at: datetime | None
    retired_at: datetime | None
    public_key_url: str = ""


class SigningKeyPublic(BaseModel):
    """The public key export - safe to expose without authentication (the
    whole point is that DNF clients fetch it, task section 7)."""

    fingerprint: str
    public_key_armor: str


class GenerateKeyRequest(BaseModel):
    validity_days: int | None = Field(
        default=None,
        ge=1,
        le=3650,
        description="Overrides signing_settings.validity_days for this key only. "
        "Null means 'use the configured default'.",
    )
    no_expiration: bool = Field(
        default=False,
        description="Generate a key with no expiration. Only honored if policy allows it "
        "(task section 4) - rejected otherwise.",
    )


class PublishKeyRequest(BaseModel):
    reason: str = Field(default="manual", max_length=255)


class ExtendExpirationRequest(BaseModel):
    additional_days: int = Field(ge=1, le=3650)


class RepositorySigningStatus(BaseModel):
    package_signing_enabled: bool
    metadata_signing_enabled: bool
    package_signing_service: str | None
    package_signing_fingerprint: str | None
    metadata_signing_service: str | None


class RepositorySigningActionResult(BaseModel):
    job_id: uuid.UUID
