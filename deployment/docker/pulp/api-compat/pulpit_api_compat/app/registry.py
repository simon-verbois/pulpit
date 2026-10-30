"""Preserve native registry guards on pulp_container 2.29 distribution writes."""


def repair_registry_guard_field(serializer) -> None:
    """Correct the obsolete view name without changing the accepted guard model.

    DetailRelatedField emits the core content-redirect URL, but this plugin
    version still validates against a container route that no longer exists.
    Change only affected serializer instances; leave future upstream fixes alone.
    """
    if not type(serializer).__module__.startswith("pulp_container."):
        return
    field = serializer.fields.get("content_guard")
    if (
        getattr(field, "view_name", None)
        == "contentguards-container/content-redirect-detail"
    ):
        field.view_name = "contentguards-core/content_redirect-detail"


def install_registry_compat() -> None:
    """Install the native guard correction at distribution validation."""
    from functools import wraps

    from pulpcore.app.serializers import DistributionSerializer
    from rest_framework import serializers

    if getattr(DistributionSerializer, "_pulpit_registry_compat", False):
        return
    original = DistributionSerializer.run_validation

    @wraps(original)
    def run_validation(self, data=serializers.empty):
        repair_registry_guard_field(self)
        return original(self, data)

    DistributionSerializer.run_validation = run_validation
    DistributionSerializer._pulpit_registry_compat = True
