"""Pydantic request/response models for the trusted_ca API.

The PEM itself IS returned by TrustedCaCertificateRead - unlike
default_settings' proxy password, a CA certificate is public material by
definition (task/module docstring, models.py), so there is nothing to keep
write-only here.
"""

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")


class TrustedCaCertificateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    pem: str
    status: str
    last_error: str | None
    created_at: datetime
    updated_at: datetime


class TrustedCaCertificateCreate(BaseModel):
    # Restricted to what app/adapters/pulp/ca_trust.py's anchor_filename
    # can pass through unchanged - keeps the on-disk filename in Pulp's
    # trust store predictable/debuggable instead of silently mangled.
    name: str = Field(min_length=1, max_length=255)
    pem: str

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        if not _NAME_PATTERN.fullmatch(value):
            raise ValueError(
                "name may only contain letters, digits, '_', and '-' (no spaces or dots)"
            )
        return value

    @field_validator("pem")
    @classmethod
    def _validate_pem(cls, value: str) -> str:
        stripped = value.strip()
        if "-----BEGIN CERTIFICATE-----" not in stripped:
            raise ValueError(
                "must be a PEM-encoded certificate, starting with "
                "-----BEGIN CERTIFICATE-----"
            )
        if "-----END CERTIFICATE-----" not in stripped:
            raise ValueError("PEM certificate is missing its -----END CERTIFICATE----- footer")
        return stripped
