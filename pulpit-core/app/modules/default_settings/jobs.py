"""Bulk-applies the instance default proxy to every existing Remote,
regardless of plugin - the explicit "force overwrite" action next to the
Proxy settings form (unlike `RemoteConnectionSettingsFields.tsx`'s own
per-Remote opt-in, which only ever applies the default automatically to a
*new* Remote). Runs as a job (app/core/jobs), not inline in the request,
since it can page through an unbounded number of remotes across every
plugin (same reasoning as signing's periodic jobs)."""

from sqlalchemy.orm import Session

from app.adapters.pulp.client import get_pulp_client
from app.adapters.pulp.exceptions import PulpAdapterError
from app.core.crypto import decrypt_secret
from app.core.jobs.registry import job_registry
from app.modules.default_settings import service

JOB_TYPE = "default_settings.apply_proxy_to_all_remotes"


def _proxy_body(db: Session) -> dict:
    row = service.get_settings_row(db)
    return {
        # "" clears a field for Pulp (never null for these string fields,
        # VERIFIED against every Create/Edit Remote modal's own convention)
        # - empty proxy_url/proxy_username here means "remove the proxy",
        # matching a blank Default Settings form applied everywhere.
        "proxy_url": row.proxy_url or None,
        "proxy_username": row.proxy_username or None,
        "proxy_password": (
            decrypt_secret(row.proxy_password_encrypted)
            if row.proxy_password_encrypted is not None
            else None
        ),
        "tls_validation": row.proxy_tls_validation,
        "ca_cert": row.proxy_ca_cert,
    }


def apply_proxy_to_all_remotes_job(db: Session, _payload: dict) -> dict:
    body = _proxy_body(db)
    db.commit()
    client = get_pulp_client()

    updated: list[str] = []
    failed: list[dict] = []
    limit = 100
    offset = 0
    while True:
        page = client.list_remotes_page(limit=limit, offset=offset)
        results = page["results"]
        if not results:
            break
        for remote in results:
            try:
                client.patch_remote(remote["pulp_href"], body)
                updated.append(remote.get("name") or remote["pulp_href"])
            except PulpAdapterError as exc:
                # Never let one remote's failure (e.g. a plugin-specific
                # field validation quirk) abort the whole run - same
                # "never blocks the rest" philosophy as signing's own bulk
                # operations (docs/signing.md).
                failed.append({"name": remote.get("name"), "error": str(exc)})
        offset += limit
        if page.get("next") is None:
            break

    return {"updated_count": len(updated), "updated": updated, "failed": failed}


def register() -> None:
    job_registry.register(JOB_TYPE, apply_proxy_to_all_remotes_job)
