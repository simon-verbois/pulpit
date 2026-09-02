"""Key backend abstraction (task section 4).

The signing module's business logic (service.py, jobs.py) depends only on
this interface, never on subprocess/GPG details directly - so a future
Vault, HSM, or cloud KMS backend can be dropped in without touching
anything else in the module. The only implementation in v1 is
LocalGPGKeyManager (gpg_local.py), and it is imported ONLY by
pulpit-worker's process (see worker/main.py) - the API process never
imports app.modules.signing.gpg_local, so it has no code path to private
key material even in principle (task section 15).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class GeneratedKey:
    fingerprint: str
    key_id: str
    public_key_armor: str
    created_at: datetime
    expires_at: datetime | None


class KeyManager(ABC):
    @abstractmethod
    def generate_key(
        self,
        *,
        identity_name: str,
        identity_email: str,
        algorithm: str,
        validity_days: int | None,
    ) -> GeneratedKey:
        """Generates a new keypair. `validity_days=None` means no expiration
        (task section 4: "no expiration, if enabled by policy") - the caller
        (service-layer policy check) is responsible for only allowing that
        when policy permits it; this method does not itself enforce policy."""

    @abstractmethod
    def export_public_key(self, fingerprint: str) -> str:
        """Returns the ASCII-armored public key. Never touches/returns
        private key material."""

    @abstractmethod
    def extend_expiration(self, fingerprint: str, new_validity_days: int | None) -> datetime | None:
        """Extends (or clears) a key's expiration in the backend, returning
        the new expiry. Used by the "Extend expiration" admin action."""
