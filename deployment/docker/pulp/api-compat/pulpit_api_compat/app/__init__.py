from pulpcore.plugin import PulpPluginAppConfig


class PulpitAPICompatibilityAppConfig(PulpPluginAppConfig):
    """Correct native API inconsistencies without introducing new resources."""

    name = "pulpit_api_compat.app"
    label = "pulpit_api_compat"
    version = "1.0.0"
    python_package_name = "pulpit-api-compat"
    domain_compatible = True

    def ready(self):
        super().ready()
        from .registry import install_registry_compat
        from .task_groups import install_task_group_compat

        install_registry_compat()
        install_task_group_compat()
