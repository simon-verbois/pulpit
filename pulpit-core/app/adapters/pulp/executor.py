"""Automates operations that otherwise leave a manual step to an
administrator - signing's `core.SigningService` registration (see
pulp_bootstrap.py) and trusted_ca's CA-trust-store sync
(app/adapters/pulp/ca_trust.py). Behind a `PulpCommandExecutor` interface,
mirroring the `KeyManager` pattern (app/modules/signing/key_manager.py):
the business logic (each module's jobs.py) depends only on this interface,
never on *how* a command actually reaches the Pulp server, so a Kubernetes,
bare-metal, or SSH-managed deployment can plug in its own implementation
without touching anything else.

`DockerExecExecutor` is the only implementation shipped, because this
project's reference deployment is Docker Compose - it is NOT assumed to be
the deployment target in general (task requirement: the backend "ne sera
pas forcément docker"). It talks to the Docker Engine API (never shells out
to the `docker` CLI, which may not exist in the worker image) through
`DOCKER_HOST`, which in this project's compose.yml points at a *scoped*
socket proxy (`docker-socket-proxy`, CONTAINERS+EXEC only) rather than the
raw host socket - see docs/signing.md "Automating the manual Pulp step" for
the full security rationale and what a non-Docker deployment should
implement instead (e.g. a Kubernetes `KubernetesExecExecutor` using the K8s
exec API, or a tiny HTTP agent process run alongside Pulp).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.core.config import Settings


class ExecutorUnavailableError(RuntimeError):
    """Raised when no executor is configured, or it could not reach its
    target - callers must treat this as "fall back to the manual command",
    never as a hard failure of the operation that needed it."""


@dataclass
class CommandResult:
    exit_code: int
    stdout: str
    stderr: str

    @property
    def ok(self) -> bool:
        return self.exit_code == 0


class PulpCommandExecutor(ABC):
    @abstractmethod
    def run_pulpcore_manager(self, args: list[str], *, timeout: int = 60) -> CommandResult:
        """Runs `pulpcore-manager <args>` in the Pulp server's own context
        (its Python environment, its database connection, its filesystem)
        and returns the result. Implementations must never use a shell
        string - `args` is a plain list, exactly like `subprocess.run`."""

    @abstractmethod
    def run_shell(self, script: str, *, timeout: int = 60) -> CommandResult:
        """Runs an arbitrary POSIX shell script (`sh -c script`) in the Pulp
        server's own context - for a real filesystem/OS-level operation
        `run_pulpcore_manager`'s argv-only shape can't express, currently
        only trusted_ca's CA-trust-store reconciliation
        (app/adapters/pulp/ca_trust.py). `script` must already be fully
        resolved/escaped by the caller (e.g. base64-encoded file content) -
        this never interpolates untrusted input itself."""


class DockerExecExecutor(PulpCommandExecutor):
    """VERIFIED shared-volume/uid convention (docs/signing.md "Shared volume
    permissions"): the script/key volumes are already visible inside the
    `pulp` container at fixed paths, so `run_pulpcore_manager` only needs to
    invoke it there - no file copying involved. `run_shell` is the one
    exception: trusted_ca's CA files live directly in the `pulp` container's
    own filesystem (its OCI image's CA trust store), so writing them is
    unavoidably a shell command, not a pulpcore-manager one.
    """

    def __init__(self, *, docker_host: str, container_label: str):
        # Imported lazily: the `docker` package is only a dependency of the
        # worker's own requirements, and only actually needed when this
        # executor is constructed (i.e. never by the pulpit-core API image).
        import docker

        self._client = docker.DockerClient(base_url=docker_host)
        self._container_label = container_label

    def _find_container(self):
        key, _, value = self._container_label.partition("=")
        containers = self._client.containers.list(filters={"label": f"{key}={value}"})
        if not containers:
            raise ExecutorUnavailableError(
                f"No running container found with label {self._container_label!r}"
            )
        return containers[0]

    def _exec(self, argv: list[str]) -> CommandResult:
        import docker.errors

        try:
            container = self._find_container()
            exit_code, output = container.exec_run(
                argv, demux=True, stdout=True, stderr=True
            )
        except docker.errors.DockerException as exc:
            raise ExecutorUnavailableError(f"Docker exec failed: {exc}") from exc
        stdout, stderr = output
        return CommandResult(
            exit_code=exit_code,
            stdout=(stdout or b"").decode(errors="replace"),
            stderr=(stderr or b"").decode(errors="replace"),
        )

    def run_pulpcore_manager(self, args: list[str], *, timeout: int = 60) -> CommandResult:
        return self._exec(["pulpcore-manager", *args])

    def run_shell(self, script: str, *, timeout: int = 60) -> CommandResult:
        return self._exec(["sh", "-c", script])


def build_executor(settings: Settings) -> PulpCommandExecutor | None:
    """Returns None (not an error) when no executor is configured - the
    caller falls back to surfacing the manual command, exactly as if
    automation had never been built (task requirement: no regression for a
    deployment that can't or doesn't want to grant this)."""
    if not settings.pulp_executor_docker_host:
        return None
    return DockerExecExecutor(
        docker_host=settings.pulp_executor_docker_host,
        container_label=settings.pulp_executor_container_label,
    )
