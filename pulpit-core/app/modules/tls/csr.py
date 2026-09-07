"""Certificate signing request generation for the FreeIPA provider - the
private key is generated and kept entirely locally; only the CSR (a public
artifact by construction, it contains no private key material) is ever sent
to FreeIPA."""

from dataclasses import dataclass

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


@dataclass
class GeneratedCsr:
    key_pem: str
    csr_pem: str


def generate_csr(common_name: str) -> GeneratedCsr:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    csr = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)]))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName(common_name)]), critical=False)
        .sign(key, hashes.SHA256())
    )
    return GeneratedCsr(
        key_pem=key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode(),
        csr_pem=csr.public_bytes(serialization.Encoding.PEM).decode(),
    )
