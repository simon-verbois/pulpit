"""Automates operations that otherwise leave a manual step to an
administrator - signing's `core.SigningService` registration (see
pulp_bootstrap.py). Behind a `PulpCommandExecutor` interface, mirroring the
`KeyManager` pattern (app/modules/signing/key_manager.py):
the business logic (each module's jobs.py) depends only on this interface,
never on *how* a command actually reaches the Pulp server, so a Kubernetes,
bare-metal, or SSH-managed deployment can plug in its own implementation
without touching anything else.

Two implementations ship: `DockerExecExecutor` for this project's reference
Compose deployment, and `KubernetesExecExecutor` for deployment/kube/ (docs/DEPLOYMENT.md
"Kubernetes"). Neither is assumed to be *the* deployment target (task
requirement: the backend "ne sera pas forcément docker") - `build_executor()`
picks whichever one is actually configured, and a deployment that configures
neither gets the pre-existing manual-command flow, never a hard failure.

`DockerExecExecutor` talks to the Docker Engine API (never shells out to the
`docker` CLI, which may not exist in the worker image) through `DOCKER_HOST`,
which in compose.yml points at a *scoped* socket proxy (`docker-socket-proxy`,
CONTAINERS+EXEC only) rather than the raw host socket - see docs/signing.md
"Automating the manual Pulp step" for the full security rationale. VERIFIED
live end-to-end against a real Podman socket too (`docker-py`'s
`containers.list`/`exec_run` both work unchanged - Podman's API is
Docker-API-compatible for these calls), `docker-socket-proxy` included, once
one SELinux confinement gotcha is worked around - see deployment/podman/
(`podman play kube` manifests, not Compose) and its README for the exact
fix (`securityContext.seLinuxOptions.type: spc_t`).

`KubernetesExecExecutor` uses the official `kubernetes` client's exec-over-
websocket API (`kubernetes.stream.stream` against `connect_get_namespaced_pod_exec`)
rather than shelling out to `kubectl`, authenticated via
`config.load_incluster_config()` - the ServiceAccount token/CA cert every pod
already has mounted at a fixed path, the standard way any in-cluster client
authenticates to the API server (no DOCKER_HOST-style connection string to
configure). deployment/kube/pulpit.yaml grants the narrow `pods/exec` + `pods`
get/list RBAC permissions this needs, scoped to one namespace.
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


class DockerExecExecutor(PulpCommandExecutor):
    """VERIFIED shared-volume/uid convention (docs/signing.md "Shared volume
    permissions"): the script/key volumes are already visible inside the
    `pulp` container at fixed paths, so `run_pulpcore_manager` only needs to
    invoke it there - no file copying involved.
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


class KubernetesExecExecutor(PulpCommandExecutor):
    """Selects the `pulp` pod by a label selector (`pod_label`, same
    "selector, not a fixed name" convention as DockerExecExecutor's
    `container_label` - a rolling update/new ReplicaSet changes the pod name
    but never its labels), then runs commands via the Kubernetes API's
    `pods/exec` subresource - no `kubectl` binary, no extra network hop
    through anything Docker-shaped.
    """

    def __init__(self, *, namespace: str, pod_label: str):
        # Imported lazily, same reasoning as DockerExecExecutor's `docker`
        # import: only pulpit-worker ever constructs this, and only when
        # actually configured to.
        from kubernetes import client, config

        try:
            # The standard, idiomatic way any in-cluster client authenticates
            # to the API server: reads the ServiceAccount token/CA cert
            # Kubernetes itself mounts into every pod at a fixed path - no
            # connection string/DOCKER_HOST-style config needed.
            config.load_incluster_config()
        except config.ConfigException as exc:
            raise ExecutorUnavailableError(
                f"Not running inside a Kubernetes cluster (or no ServiceAccount "
                f"token mounted): {exc}"
            ) from exc

        self._client = client.CoreV1Api()
        self._namespace = namespace
        self._pod_label = pod_label

    def _find_pod_name(self) -> str:
        from kubernetes.client.exceptions import ApiException

        try:
            pods = self._client.list_namespaced_pod(
                self._namespace, label_selector=self._pod_label
            )
        except ApiException as exc:
            raise ExecutorUnavailableError(f"Kubernetes API call failed: {exc}") from exc
        running = [pod for pod in pods.items if pod.status.phase == "Running"]
        if not running:
            raise ExecutorUnavailableError(
                f"No running pod found in namespace {self._namespace!r} matching "
                f"label selector {self._pod_label!r}"
            )
        return running[0].metadata.name

    def _exec(self, argv: list[str], *, timeout: int) -> CommandResult:
        from kubernetes.client.exceptions import ApiException
        from kubernetes.stream import stream

        pod_name = self._find_pod_name()
        try:
            resp = stream(
                self._client.connect_get_namespaced_pod_exec,
                pod_name,
                self._namespace,
                command=argv,
                stderr=True,
                stdin=False,
                stdout=True,
                tty=False,
                _preload_content=False,
            )
            resp.run_forever(timeout=timeout)
            # VERIFIED against the installed client's own WSClient source:
            # `.returncode` only parses the exec channel's status message
            # once the connection is actually closed (`is_open()` False) -
            # still open here means `run_forever`'s timeout elapsed before
            # the command finished, not that it succeeded silently.
            if resp.is_open():
                resp.close()
                raise ExecutorUnavailableError(
                    f"Kubernetes exec timed out after {timeout}s waiting for "
                    f"{argv!r} to finish"
                )
            stdout = resp.read_stdout()
            stderr = resp.read_stderr()
            exit_code = resp.returncode
            resp.close()
        except ApiException as exc:
            raise ExecutorUnavailableError(f"Kubernetes exec failed: {exc}") from exc
        return CommandResult(
            exit_code=0 if exit_code is None else exit_code,
            stdout=stdout or "",
            stderr=stderr or "",
        )

    def run_pulpcore_manager(self, args: list[str], *, timeout: int = 60) -> CommandResult:
        return self._exec(["pulpcore-manager", *args], timeout=timeout)


def build_executor(settings: Settings) -> PulpCommandExecutor | None:
    """Returns None (not an error) when no executor is configured - the
    caller falls back to surfacing the manual command, exactly as if
    automation had never been built (task requirement: no regression for a
    deployment that can't or doesn't want to grant this). A deployment sets
    exactly one of the two configs below (Kubernetes checked first only
    because it's the more specific/recent addition - in practice a real
    deployment is either Docker/Podman Compose or Kubernetes, never both)."""
    if settings.pulp_executor_kubernetes_namespace:
        return KubernetesExecExecutor(
            namespace=settings.pulp_executor_kubernetes_namespace,
            pod_label=settings.pulp_executor_kubernetes_pod_label,
        )
    if settings.pulp_executor_docker_host:
        return DockerExecExecutor(
            docker_host=settings.pulp_executor_docker_host,
            container_label=settings.pulp_executor_container_label,
        )
    return None
