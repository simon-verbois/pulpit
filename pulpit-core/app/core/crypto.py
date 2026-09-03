"""Encryption at rest for secrets pulpit-core itself must store and later
retrieve in plaintext (unlike a password hash, these must be decryptable -
e.g. default_settings.proxy_password_encrypted, used to actually configure a
proxy, not just verify a login). Symmetric (Fernet) rather than a KMS/HSM
integration - a single shared secret_key is enough for the trust model here
(app/core/config/settings.py's own comment on `secret_key`), and matches the
scale of what's actually stored (a handful of instance-wide settings, not
per-user secrets).
"""

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


class SecretKeyNotConfigured(RuntimeError):
    def __init__(self) -> None:
        super().__init__(
            "PULPIT_CORE_SECRET_KEY is not set - cannot encrypt or decrypt a stored secret. "
            "Generate one with: "
            "python3 -c \"from cryptography.fernet import Fernet; "
            'print(Fernet.generate_key().decode())"'
        )


@lru_cache
def _fernet() -> Fernet:
    key = get_settings().secret_key
    if not key:
        raise SecretKeyNotConfigured
    return Fernet(key.encode())


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(token: str) -> str:
    """Raises `cryptography.fernet.InvalidToken` if `token` wasn't produced
    by `encrypt_secret` under the current `secret_key` (wrong/rotated key,
    or corrupted data) - never silently returns garbage."""
    return _fernet().decrypt(token.encode()).decode()


__all__ = ["InvalidToken", "SecretKeyNotConfigured", "decrypt_secret", "encrypt_secret"]
