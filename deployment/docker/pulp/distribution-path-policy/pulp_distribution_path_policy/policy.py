from collections.abc import Mapping


# Public path namespaces deliberately follow Pulpit's user-facing module names,
# not every plugin's concrete API type (for example pulp_deb exposes an "apt"
# distribution and pulp_hugging_face uses an underscore in its Python package).
PLUGIN_PATH_PREFIXES: Mapping[str, str] = {
    "pulp_ansible": "ansible",
    "pulp_container": "container",
    "pulp_deb": "deb",
    "pulp_file": "file",
    "pulp_gem": "gem",
    "pulp_hugging_face": "hugging-face",
    "pulp_maven": "maven",
    "pulp_npm": "npm",
    "pulp_ostree": "ostree",
    "pulp_python": "python",
    "pulp_rpm": "rpm",
}

CORE_MODEL_PATH_PREFIXES: Mapping[str, str] = {
    "ArtifactDistribution": "artifact",
    "OpenPGPDistribution": "openpgp",
}


def required_prefix_for_model(model_module: str, model_name: str) -> str | None:
    package = model_module.partition(".")[0]
    prefix = (
        CORE_MODEL_PATH_PREFIXES.get(model_name)
        if package == "pulpcore"
        else PLUGIN_PATH_PREFIXES.get(package)
    )
    return f"{prefix}/" if prefix else None


def distribution_path_error(
    model_module: str, model_name: str, base_path: str
) -> str | None:
    required_prefix = required_prefix_for_model(model_module, model_name)
    if required_prefix is None:
        return None
    if base_path.startswith(required_prefix) and len(base_path) > len(required_prefix):
        return None
    return f"Base path must start with '{required_prefix}' and include a name after it."
