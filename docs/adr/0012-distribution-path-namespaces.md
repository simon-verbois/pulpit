# ADR 0012: Namespace distribution base paths by plugin

## Status

Accepted.

## Context

Pulp requires distribution `base_path` values to be globally non-overlapping, even though each
plugin exposes its own distribution endpoint. An unscoped value such as `stable` gives no clue
which content type it serves and can prevent another plugin from using a related path.

Pulpit's browser UI can prevent accidental unscoped paths, but API clients call Pulp through the
same nginx route and Pulpit workers can call Pulp directly. An nginx-only or frontend-only check
would therefore not be authoritative.

## Decision

Every plugin distribution managed by this deployment must use a plugin-scoped `base_path`:

| Plugin        | Required prefix |
| ------------- | --------------- |
| ansible       | `ansible/`      |
| container     | `container/`    |
| deb           | `deb/`          |
| file          | `file/`         |
| gem           | `gem/`          |
| hugging_face  | `hugging-face/` |
| maven         | `maven/`        |
| npm           | `npm/`          |
| core OpenPGP  | `openpgp/`      |
| core artifact | `artifact/`     |
| ostree        | `ostree/`       |
| python        | `python/`       |
| rpm           | `rpm/`          |

The derived Pulp image installs the small `pulp-distribution-path-policy` extension. It wraps the
common Pulp distribution serializer validation, including concrete serializers such as
pulp_container's which override field-level validation. Invalid create, replace, or base-path
patch requests fail synchronously with a field-level HTTP 400 before an asynchronous task is
dispatched.

The UI renders the required prefix as a fixed, non-editable part of the final URL and submits the
prefixed value. Pulpit-core's optional fixture seed follows the same convention.

Existing non-conforming distributions are not modified automatically. A PATCH which omits
`base_path` remains valid; changing that field requires adopting the prefix. This avoids silently
breaking client URLs during deployment.

## Consequences

- The policy applies to browser requests, direct API commands through Pulpit's nginx, and internal
  clients that address Pulp directly.
- Deployments using an external, non-derived Pulp image do not receive this deployment policy;
  they still get the UI prefix but must install an equivalent Pulp-side policy themselves.
- Adding a new content plugin with distributions requires adding its public namespace to both the
  Pulp policy and the frontend prefix map.
- Distribution names remain normal Pulp names. Pulpit's create forms continue to derive the name
  from the fully-prefixed base path to avoid asking for two identifiers.
