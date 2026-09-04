from unittest.mock import MagicMock

import pytest

from app.adapters.pulp.executor import (
    DockerExecExecutor,
    ExecutorUnavailableError,
    KubernetesExecExecutor,
    build_executor,
)
from app.core.config import Settings
from app.modules.signing.models import PulpServicePurpose, SigningPulpService
from app.modules.signing.pulp_bootstrap import attempt_automatic_registration


def test_build_executor_returns_none_when_unconfigured():
    """Strictly additive (docs/signing.md "Automating the manual Pulp
    step"): a deployment that never sets PULPIT_CORE_PULP_EXECUTOR_DOCKER_HOST
    or PULPIT_CORE_PULP_EXECUTOR_KUBERNETES_NAMESPACE gets exactly the
    pre-automation behavior, not an error."""
    settings = Settings(pulp_executor_docker_host="", pulp_executor_kubernetes_namespace="")
    assert build_executor(settings) is None


def test_build_executor_returns_docker_executor_when_configured(monkeypatch):
    created = {}

    class _FakeDockerClient:
        def __init__(self, base_url):
            created["base_url"] = base_url

    import docker

    monkeypatch.setattr(docker, "DockerClient", _FakeDockerClient)
    settings = Settings(pulp_executor_docker_host="tcp://docker-socket-proxy:2375")
    executor = build_executor(settings)
    assert isinstance(executor, DockerExecExecutor)
    assert created["base_url"] == "tcp://docker-socket-proxy:2375"


def test_run_pulpcore_manager_raises_unavailable_when_no_container_found(monkeypatch):
    import docker

    monkeypatch.setattr(docker, "DockerClient", lambda base_url: MagicMock(containers=MagicMock(list=lambda **_: [])))
    executor = DockerExecExecutor(docker_host="tcp://x:2375", container_label="com.docker.compose.service=pulp")

    with pytest.raises(ExecutorUnavailableError):
        executor.run_pulpcore_manager(["add-signing-service"])


def test_run_pulpcore_manager_execs_into_found_container(monkeypatch):
    import docker

    fake_container = MagicMock()
    fake_container.exec_run.return_value = (0, (b"ok\n", b""))
    fake_client = MagicMock()
    fake_client.containers.list.return_value = [fake_container]
    monkeypatch.setattr(docker, "DockerClient", lambda base_url: fake_client)

    executor = DockerExecExecutor(docker_host="tcp://x:2375", container_label="com.docker.compose.service=pulp")
    result = executor.run_pulpcore_manager(["add-signing-service", "name"])

    assert result.ok
    assert result.stdout == "ok\n"
    fake_container.exec_run.assert_called_once()
    called_args = fake_container.exec_run.call_args[0][0]
    assert called_args == ["pulpcore-manager", "add-signing-service", "name"]
    fake_client.containers.list.assert_called_once_with(
        filters={"label": "com.docker.compose.service=pulp"}
    )


def test_build_executor_prefers_kubernetes_when_both_configured(monkeypatch):
    from kubernetes import config

    monkeypatch.setattr(config, "load_incluster_config", lambda: None)
    settings = Settings(
        pulp_executor_docker_host="tcp://docker-socket-proxy:2375",
        pulp_executor_kubernetes_namespace="pulpit",
    )
    executor = build_executor(settings)
    assert isinstance(executor, KubernetesExecExecutor)


def test_build_executor_returns_kubernetes_executor_when_configured(monkeypatch):
    from kubernetes import config

    monkeypatch.setattr(config, "load_incluster_config", lambda: None)
    settings = Settings(
        pulp_executor_kubernetes_namespace="pulpit",
        pulp_executor_kubernetes_pod_label="app=pulp",
    )
    executor = build_executor(settings)
    assert isinstance(executor, KubernetesExecExecutor)


def test_kubernetes_executor_raises_unavailable_when_not_in_cluster(monkeypatch):
    from kubernetes import config

    def _raise():
        raise config.ConfigException("no ServiceAccount token found")

    monkeypatch.setattr(config, "load_incluster_config", _raise)

    with pytest.raises(ExecutorUnavailableError):
        KubernetesExecExecutor(namespace="pulpit", pod_label="app=pulp")


def test_kubernetes_executor_raises_unavailable_when_no_pod_found(monkeypatch):
    from kubernetes import client, config

    monkeypatch.setattr(config, "load_incluster_config", lambda: None)
    fake_api = MagicMock()
    fake_api.list_namespaced_pod.return_value = MagicMock(items=[])
    monkeypatch.setattr(client, "CoreV1Api", lambda: fake_api)

    executor = KubernetesExecExecutor(namespace="pulpit", pod_label="app=pulp")
    with pytest.raises(ExecutorUnavailableError):
        executor.run_pulpcore_manager(["add-signing-service"])


def test_kubernetes_executor_execs_into_found_pod(monkeypatch):
    from kubernetes import client, config
    import kubernetes.stream as stream_module

    monkeypatch.setattr(config, "load_incluster_config", lambda: None)

    fake_pod = MagicMock()
    fake_pod.status.phase = "Running"
    fake_pod.metadata.name = "pulp-abc123"
    fake_api = MagicMock()
    fake_api.list_namespaced_pod.return_value = MagicMock(items=[fake_pod])
    monkeypatch.setattr(client, "CoreV1Api", lambda: fake_api)

    fake_resp = MagicMock()
    fake_resp.is_open.return_value = False
    fake_resp.read_stdout.return_value = "ok\n"
    fake_resp.read_stderr.return_value = ""
    fake_resp.returncode = 0
    fake_stream = MagicMock(return_value=fake_resp)
    monkeypatch.setattr(stream_module, "stream", fake_stream)

    executor = KubernetesExecExecutor(namespace="pulpit", pod_label="app=pulp")
    result = executor.run_pulpcore_manager(["add-signing-service", "name"])

    assert result.ok
    assert result.stdout == "ok\n"
    fake_api.list_namespaced_pod.assert_called_once_with("pulpit", label_selector="app=pulp")
    fake_resp.close.assert_called_once()
    # The exec call itself (stream's positional args after api_method) must
    # target the pod actually found above, not a hardcoded name.
    call_args = fake_stream.call_args
    assert call_args[0][1] == "pulp-abc123"
    assert call_args[1]["command"] == ["pulpcore-manager", "add-signing-service", "name"]


def test_kubernetes_executor_raises_unavailable_on_timeout(monkeypatch):
    from kubernetes import client, config
    import kubernetes.stream as stream_module

    monkeypatch.setattr(config, "load_incluster_config", lambda: None)

    fake_pod = MagicMock()
    fake_pod.status.phase = "Running"
    fake_pod.metadata.name = "pulp-abc123"
    fake_api = MagicMock()
    fake_api.list_namespaced_pod.return_value = MagicMock(items=[fake_pod])
    monkeypatch.setattr(client, "CoreV1Api", lambda: fake_api)

    fake_resp = MagicMock()
    # Still open after run_forever() returns - the timeout elapsed before
    # the command finished, not a successful/silent completion.
    fake_resp.is_open.return_value = True
    monkeypatch.setattr(stream_module, "stream", lambda *args, **kwargs: fake_resp)

    executor = KubernetesExecExecutor(namespace="pulpit", pod_label="app=pulp")
    with pytest.raises(ExecutorUnavailableError):
        executor.run_pulpcore_manager(["add-signing-service"], timeout=1)
    fake_resp.close.assert_called_once()


def test_attempt_automatic_registration_passes_the_shared_gnupg_home():
    """BUG FOUND LIVE (docs/signing.md): the args sent to the executor must
    include --home pointing at the shared GNUPGHOME - without it,
    add-signing-service looks in the executing shell's own default
    ~/.gnupg (empty) and fails with "No public key"."""
    executor = MagicMock()
    executor.run_pulpcore_manager.return_value = None
    row = SigningPulpService(
        purpose=PulpServicePurpose.PACKAGE,
        name="Pulp RPM Signing Service",
        fingerprint="A" * 40,
        bootstrap_command="unused",
    )

    attempt_automatic_registration(executor, row, scripts_dir="/var/lib/pulpit-signing/scripts")

    called_args = executor.run_pulpcore_manager.call_args[0][0]
    assert "--home" in called_args
    home_value = called_args[called_args.index("--home") + 1]
    assert home_value  # non-empty, points somewhere real
