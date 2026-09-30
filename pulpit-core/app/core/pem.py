"""PEM sanity check shared by every setting that stores a trusted CA
certificate (default_settings' proxy_ca_cert, ldap's ca_cert)."""


def validate_ca_cert_pem(value: str) -> str:
    stripped = value.strip()
    if "-----BEGIN CERTIFICATE-----" not in stripped:
        raise ValueError(
            "must be a PEM-encoded certificate, starting with -----BEGIN CERTIFICATE-----"
        )
    if "-----END CERTIFICATE-----" not in stripped:
        raise ValueError("PEM certificate is missing its -----END CERTIFICATE----- footer")
    return stripped
