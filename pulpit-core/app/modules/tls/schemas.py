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
