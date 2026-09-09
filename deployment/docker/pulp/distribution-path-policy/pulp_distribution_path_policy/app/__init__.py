from pulpcore.plugin import PulpPluginAppConfig


class PulpDistributionPathPolicyAppConfig(PulpPluginAppConfig):
    """Install Pulpit's cross-plugin distribution path policy."""

    name = "pulp_distribution_path_policy.app"
    label = "pulp_distribution_path_policy"
    version = "1.0.0"
    python_package_name = "pulp-distribution-path-policy"
    domain_compatible = True

    def ready(self):
        super().ready()

        from .serializer_policy import install_distribution_path_policy

        install_distribution_path_policy()
