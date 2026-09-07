"""Manual certificate/key upload validation.

Applied SYNCHRONOUSLY in the route handler (routes/manual.py), not through
enqueue_job/jobs.py like every other write path in this module - a
deliberate deviation from the usual "routes enqueue, jobs execute"
convention. The uploaded private key must never transit through the `jobs`
table (a database table, even if only transiently) - the same "no private
key material anywhere in this database" rule signing/models.py states, just
applied here to an admin-supplied key instead of a generated one. There is
no external network call in this path either, so there is nothing this would
gain from being asynchronous in the first place.
"""

from dataclasses import dataclass
from datetime import UTC, datetime

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa


class InvalidCertificateError(ValueError):
    """Raised for any reason the uploaded cert/key pair can't be installed -
    the route surfaces this as a 422 with the message as-is (task section 11:
    fail with a clear, specific reason, not a generic "invalid input")."""


@dataclass
class ParsedCertificate:
    subject: str
    fingerprint_sha256: str
    not_before: datetime
    not_after: datetime


def parse_and_validate(cert_pem: str, key_pem: str) -> ParsedCertificate:
    try:
        certificate = x509.load_pem_x509_certificate(cert_pem.encode())
    except ValueError as exc:
        raise InvalidCertificateError(f"Could not parse the certificate: {exc}") from exc

    try:
        private_key = serialization.load_pem_private_key(key_pem.encode(), password=None)
    except (ValueError, TypeError) as exc:
        raise InvalidCertificateError(
            f"Could not parse the private key (must be unencrypted PEM): {exc}"
        ) from exc

    if not isinstance(private_key, rsa.RSAPrivateKey | ec.EllipticCurvePrivateKey):
        raise InvalidCertificateError("Only RSA and EC private keys are supported.")

    cert_public_key = certificate.public_key()
    if not isinstance(cert_public_key, rsa.RSAPublicKey | ec.EllipticCurvePublicKey):
        raise InvalidCertificateError("Only RSA and EC certificates are supported.")

    if cert_public_key.public_numbers() != private_key.public_key().public_numbers():
        raise InvalidCertificateError("The private key does not match the certificate.")

    not_after = certificate.not_valid_after_utc
    if not_after <= datetime.now(UTC):
        raise InvalidCertificateError("This certificate has already expired.")

    return ParsedCertificate(
        subject=certificate.subject.rfc4514_string(),
        fingerprint_sha256=certificate.fingerprint(hashes.SHA256()).hex(),
        not_before=certificate.not_valid_before_utc,
        not_after=not_after,
    )
