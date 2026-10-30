from pulpcore.plugin import PulpPluginAppConfig


class RpmSigningPolicyAppConfig(PulpPluginAppConfig):
    name = "pulp_rpm_signing_policy.app"
    label = "pulp_rpm_signing_policy"
    version = "1.0.0"
    python_package_name = "pulp-rpm-signing-policy"
    domain_compatible = True

    def ready(self):
        super().ready()
        from .policy import install

        install()
