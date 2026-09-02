class PulpAdapterError(RuntimeError):
    """Raised for any non-2xx response from Pulp not covered by a subclass."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class PulpNotFoundError(PulpAdapterError):
    pass
