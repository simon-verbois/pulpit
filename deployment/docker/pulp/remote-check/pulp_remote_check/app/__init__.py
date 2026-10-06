from pulpcore.plugin import PulpPluginAppConfig


class PulpRemoteCheckAppConfig(PulpPluginAppConfig):
    """Expose Pulpit's "Test connection" endpoint for saved remotes."""

    name = "pulp_remote_check.app"
    label = "pulp_remote_check"
    version = "1.0.0"
    python_package_name = "pulp-remote-check"
    domain_compatible = True

    def ready(self):
        super().ready()
        from pulpit_egress import install, install_pulp_factory
        install()
        install_pulp_factory()
