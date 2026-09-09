from rest_framework import serializers

from pulpcore.app.serializers import DistributionSerializer

from ..policy import distribution_path_error


def install_distribution_path_policy() -> None:
    """Apply the policy before Pulp dispatches asynchronous create tasks.

    Pulp's concrete plugin serializers all derive from DistributionSerializer.
    Wrapping run_validation, rather than validate_base_path, also covers
    pulp_container, which supplies its own field validator.
    """

    if getattr(DistributionSerializer, "_pulpit_path_policy_installed", False):
        return

    original_run_validation = DistributionSerializer.run_validation

    def run_validation(self, data=serializers.empty):
        if data is not serializers.empty and hasattr(data, "get"):
            base_path = data.get("base_path")
        else:
            base_path = None
        if isinstance(base_path, str):
            model = self.Meta.model
            message = distribution_path_error(model.__module__, model.__name__, base_path)
            if message:
                raise serializers.ValidationError({"base_path": [message]})
        return original_run_validation(self, data)

    DistributionSerializer.run_validation = run_validation
    DistributionSerializer._pulpit_path_policy_installed = True
