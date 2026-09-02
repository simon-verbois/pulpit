"""Well-known event names. Not an enum a module must import to publish -
any string works - but centralizing the ones core/modules actually emit
keeps them discoverable and typo-free across module boundaries."""

REPOSITORY_CREATED = "repository.created"
REPOSITORY_SYNCED = "repository.synced"
REPOSITORY_PUBLISHED = "repository.published"

SIGNING_KEY_GENERATED = "signing.key.generated"
SIGNING_KEY_ACTIVATED = "signing.key.activated"
SIGNING_KEY_EXPIRING = "signing.key.expiring"
SIGNING_KEY_ROTATED = "signing.key.rotated"
SIGNING_KEY_RETIRED = "signing.key.retired"

PACKAGE_SIGNATURE_FAILED = "package.signature.failed"
