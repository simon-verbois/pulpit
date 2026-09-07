from datetime import UTC, datetime, timedelta

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from app.modules.tls.manual import InvalidCertificateError, parse_and_validate
from app.modules.tls.selfsigned import generate_selfsigned


def _build_cert(common_name: str, *, not_before: datetime, not_after: datetime) -> tuple[str, str]:
    """Builds a cert/key pair with explicit, arbitrary validity bounds -
    generate_selfsigned always anchors not_before to "now", so it can't
    produce an already-expired certificate (not_after must be after
    not_before) the way a real expired upload could be."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])
    certificate = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(not_before)
        .not_valid_after(not_after)
        .sign(key, hashes.SHA256())
    )
    cert_pem = certificate.public_bytes(serialization.Encoding.PEM).decode()
    key_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    return cert_pem, key_pem


def test_accepts_a_matching_cert_and_key_pair():
    generated = generate_selfsigned(common_name="example.test", validity_days=365)

    parsed = parse_and_validate(generated.cert_pem, generated.key_pem)

    assert parsed.fingerprint_sha256 == generated.fingerprint_sha256
    assert "example.test" in parsed.subject
    # x509 certs only carry time to the second (ASN.1 UTCTime/
    # GeneralizedTime), so round-tripping through PEM loses the
    # microseconds generate_selfsigned computed with in memory.
    assert abs(parsed.not_after - generated.not_after) < timedelta(seconds=1)


def test_rejects_a_key_that_does_not_match_the_certificate():
    cert = generate_selfsigned(common_name="example.test", validity_days=365)
    other_key = generate_selfsigned(common_name="other.test", validity_days=365)

    try:
        parse_and_validate(cert.cert_pem, other_key.key_pem)
        raise AssertionError("expected InvalidCertificateError")
    except InvalidCertificateError as exc:
        assert "does not match" in str(exc)


def test_rejects_an_already_expired_certificate():
    now = datetime.now(UTC)
    cert_pem, key_pem = _build_cert(
        "example.test", not_before=now - timedelta(days=30), not_after=now - timedelta(days=1)
    )

    try:
        parse_and_validate(cert_pem, key_pem)
        raise AssertionError("expected InvalidCertificateError")
    except InvalidCertificateError as exc:
        assert "expired" in str(exc)


def test_rejects_unparseable_certificate_pem():
    generated = generate_selfsigned(common_name="example.test", validity_days=365)

    try:
        parse_and_validate("not a certificate", generated.key_pem)
        raise AssertionError("expected InvalidCertificateError")
    except InvalidCertificateError as exc:
        assert "Could not parse the certificate" in str(exc)


def test_rejects_unparseable_key_pem():
    generated = generate_selfsigned(common_name="example.test", validity_days=365)

    try:
        parse_and_validate(generated.cert_pem, "not a key")
        raise AssertionError("expected InvalidCertificateError")
    except InvalidCertificateError as exc:
        assert "Could not parse the private key" in str(exc)
