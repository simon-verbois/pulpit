from pulpcore.plugin import PulpPluginAppConfig


class PulpitAPICompatibilityAppConfig(PulpPluginAppConfig):
    """Native API fixes and repository deletion policy without new resources."""

    name = "pulpit_api_compat.app"
    label = "pulpit_api_compat"
    version = "1.1.0"
    python_package_name = "pulpit-api-compat"
    domain_compatible = True

    def ready(self):
        super().ready()
        from .registry import install_registry_compat
        from .task_groups import install_task_group_compat
        from .repository_deletion import install_repository_deletion_policy

        install_registry_compat()
        install_task_group_compat()
        install_repository_deletion_policy()
