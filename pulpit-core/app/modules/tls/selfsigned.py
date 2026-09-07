"""Self-signed certificate generation - the zero-config fallback for 8443
(task: "generer un certificat self signed en fallback sur le 8443"). Not a
substitute for a real CA-issued certificate, just enough for nginx to have
something to bind to out of the box; replaced automatically whenever it
nears expiry (jobs.renewal_check_job) or by an administrator installing a
manual/FreeIPA certificate instead.
"""

import ipaddress
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


@dataclass
class GeneratedSelfSignedCert:
    cert_pem: str
    key_pem: str
    subject: str
    fingerprint_sha256: str
    not_before: datetime
    not_after: datetime


def _subject_alt_name(common_name: str) -> x509.GeneralName:
    try:
        return x509.IPAddress(ipaddress.ip_address(common_name))
    except ValueError:
        return x509.DNSName(common_name)


def generate_selfsigned(*, common_name: str, validity_days: int) -> GeneratedSelfSignedCert:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    now = datetime.now(UTC)
    not_after = now + timedelta(days=validity_days)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])

    certificate = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(not_after)
        .add_extension(x509.SubjectAlternativeName([_subject_alt_name(common_name)]), critical=False)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )

    return GeneratedSelfSignedCert(
        cert_pem=certificate.public_bytes(serialization.Encoding.PEM).decode(),
        key_pem=key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode(),
        subject=common_name,
        fingerprint_sha256=certificate.fingerprint(hashes.SHA256()).hex(),
        not_before=now,
        not_after=not_after,
    )
