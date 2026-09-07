class FreeIPAAdapterError(Exception):
    """Any failure talking to FreeIPA - network, HTTP, or an RPC-level error
    FreeIPA itself returned."""


class FreeIPAAuthError(FreeIPAAdapterError):
    """Login specifically failed - bad credentials, or no session cookie was
    returned at all."""
