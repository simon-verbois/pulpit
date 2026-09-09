"""One sample Repository+Remote(+Distribution) per plugin, created once on a
fresh instance (jobs.py) so a new install isn't a totally empty shell. Every
URL/field below was VERIFIED live against a real Pulp instance (create-and-
delete round trip - no field here was taken from a doc example on faith
alone; see the ADR for the exact per-plugin verification).

pulp_npm is deliberately NOT included: its NpmRemoteSerializer has no
includes/excludes field at all (VERIFIED against its serializer source), so
an unfiltered sync would attempt to mirror the entire public npm registry -
skipped outright rather than ship something that could do that by accident.

pulp_maven and pulp_hugging_face ARE included, but as a remote only (no
repository/distribution): both are architecturally pull-through-cache-only
(VERIFIED against their own docs - neither exposes a "sync everything now"
mechanism), and this project didn't verify the exact repository/distribution
wiring their pull-through mode actually needs - safer to leave a ready-to-use
Remote for an admin to attach by hand than guess at that wiring.

pulp_gem is ALSO remote-only, for a different reason: VERIFIED live that
syncing the official example gem ("panda") crashes with a real upstream bug
in pulp_gem's own metadata parser (`specs.py`'s `key, value =
stmt.split(":")` raises "too many values to unpack" on a line containing a
second colon) - not a fixture-choice problem to work around by picking a
different gem (nothing rules out other gems hitting the same parser bug),
so this stays remote-only rather than risk the same crash on every fresh
install.
"""

from dataclasses import dataclass, field

PUBLIC_PATH_PREFIXES = {
    "ansible": "ansible",
    "container": "container",
    "deb": "deb",
    "file": "file",
    "gem": "gem",
    "hugging_face": "hugging-face",
    "maven": "maven",
    "npm": "npm",
    "python": "python",
    "rpm": "rpm",
}


@dataclass(frozen=True)
class PluginFixture:
    plugin: str
    remote_type_path: str
    remote_body: dict = field(default_factory=dict)
    # None on both means "remote only" (maven, hugging_face - see module docstring).
    repository_type_path: str | None = None
    distribution_type_path: str | None = None
    sync: bool = False

    @property
    def name(self) -> str:
        return self.remote_body["name"]

    @property
    def distribution_base_path(self) -> str:
        return f"{PUBLIC_PATH_PREFIXES[self.plugin]}/{self.name}"


FIXTURES: list[PluginFixture] = [
    PluginFixture(
        plugin="rpm",
        remote_type_path="rpm/rpm",
        remote_body={
            "name": "pulpit-sample-rpm",
            "url": "https://fixtures.pulpproject.org/rpm-unsigned/",
            "policy": "on_demand",
        },
        repository_type_path="rpm/rpm",
        distribution_type_path="rpm/rpm",
        sync=True,
    ),
    PluginFixture(
        plugin="file",
        remote_type_path="file/file",
        remote_body={
            "name": "pulpit-sample-file",
            "url": "https://fixtures.pulpproject.org/file/PULP_MANIFEST",
            "policy": "on_demand",
        },
        repository_type_path="file/file",
        distribution_type_path="file/file",
        sync=True,
    ),
    PluginFixture(
        plugin="deb",
        remote_type_path="deb/apt",
        remote_body={
            "name": "pulpit-sample-deb",
            "url": "http://nginx.org/packages/debian/",
            "distributions": "bookworm",
            "components": "nginx",
            "architectures": "amd64",
            "policy": "on_demand",
        },
        repository_type_path="deb/apt",
        distribution_type_path="deb/apt",
        sync=True,
    ),
    PluginFixture(
        plugin="container",
        remote_type_path="container/container",
        remote_body={
            "name": "pulpit-sample-container",
            "url": "https://registry-1.docker.io",
            "upstream_name": "pulp/test-fixture-1",
            "policy": "on_demand",
        },
        repository_type_path="container/container",
        distribution_type_path="container/container",
        sync=True,
    ),
    PluginFixture(
        plugin="ansible",
        remote_type_path="ansible/collection",
        # No "policy" field: VERIFIED live that ansible/collection remotes
        # reject "on_demand" ("not a valid choice") - "immediate" (the
        # default when omitted) is the only supported policy.
        remote_body={
            "name": "pulpit-sample-ansible",
            "url": "https://galaxy.ansible.com/",
            "requirements_file": "collections:\n  - ansible.posix",
        },
        repository_type_path="ansible/ansible",
        distribution_type_path="ansible/ansible",
        sync=True,
    ),
    PluginFixture(
        plugin="python",
        remote_type_path="python/python",
        remote_body={
            "name": "pulpit-sample-python",
            "url": "https://pypi.org/",
            "policy": "on_demand",
            "includes": ["shelf-reader"],
        },
        repository_type_path="python/python",
        distribution_type_path="python/pypi",
        sync=True,
    ),
    PluginFixture(
        plugin="gem",
        remote_type_path="gem/gem",
        # No repository/distribution/sync: VERIFIED live that syncing this
        # remote crashes with a real pulp_gem parser bug - see module
        # docstring.
        remote_body={
            "name": "pulpit-sample-gem",
            "url": "https://index.rubygems.org/",
            "policy": "on_demand",
            "includes": {"panda": None},
        },
    ),
    PluginFixture(
        plugin="maven",
        remote_type_path="maven/maven",
        # No "policy": VERIFIED live that maven remotes reject "on_demand"
        # too - cache-only, see module docstring. Remote only, no repository.
        remote_body={
            "name": "pulpit-sample-maven",
            "url": "https://repo1.maven.org/maven2/",
        },
    ),
    PluginFixture(
        plugin="hugging_face",
        remote_type_path="hugging_face/hugging-face",
        remote_body={
            "name": "pulpit-sample-huggingface",
            "url": "https://huggingface.co",
            "policy": "on_demand",
        },
    ),
]
