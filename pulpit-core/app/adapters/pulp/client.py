"""Thin, explicit Pulp REST client for server-to-server calls made by
pulpit-core/pulpit-worker (never by the browser - the frontend keeps talking
to Pulp directly per ADR 0005 for everything that isn't signing-specific).

Mirrors this project's existing frontend convention (docs/ARCHITECTURE.md
"API client layer"): a small hand-written adapter per resource, nothing
constructs a Pulp URL outside this module, and every field/endpoint used
here must be one actually verified against a live instance (docs/PULP_API.md,
AGENTS.md #3) - see docs/signing.md for the specific fields this adapter
relies on and how they were confirmed.
"""

from functools import lru_cache
from typing import Any
from urllib.parse import urlsplit

import httpx

from app.adapters.pulp.exceptions import PulpAdapterError, PulpNotFoundError
from app.core.config import Settings, get_settings


class PulpClient:
    def __init__(self, settings: Settings, *, caller_headers: dict[str, str] | None = None):
        self._caller_headers = caller_headers
        self._settings = settings
        self._base_url = settings.pulp_base_url
        self._api_base = settings.pulp_api_base_path

    def _url(self, path: str) -> str:
        base = httpx.URL(self._base_url)
        if any(ord(char) < 32 for char in path) or "\\" in path:
            raise PulpAdapterError("Invalid Pulp URL")
        parsed = urlsplit(path)
        if parsed.fragment or parsed.username or parsed.password:
            raise PulpAdapterError("Invalid Pulp URL")
        if parsed.scheme or parsed.netloc:
            target = httpx.URL(path)
        elif path.startswith("/") and not path.startswith("//"):
            target = httpx.URL(f"{self._base_url}{path}")
        else:
            raise PulpAdapterError("Pulp paths must be absolute paths on the Pulp origin")
        if (target.scheme, target.host, target.port) != (base.scheme, base.host, base.port):
            raise PulpAdapterError("Refusing credentials outside the configured Pulp origin")
        return str(target)

    def _client(self) -> httpx.Client:
        return httpx.Client(
            auth=(self._settings.pulp_service_username, self._settings.pulp_service_password)
            if self._caller_headers is None else None,
            headers=self._caller_headers,
            timeout=self._settings.pulp_request_timeout_seconds,
        )

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        with self._client() as client:
            try:
                response = client.request(method, self._url(path), **kwargs)
            except httpx.HTTPError as exc:
                raise PulpAdapterError(f"Pulp request failed: {exc}") from exc
        if response.status_code == 404:
            raise PulpNotFoundError("Pulp resource not found", status_code=404)
        if response.status_code >= 400:
            raise PulpAdapterError(
                f"Pulp returned {response.status_code}: {response.text[:500]}",
                status_code=response.status_code,
            )
        return response

    # --- Signing services (read-only in Pulp's own API - docs/PULP_API.md) ---

    def list_signing_services(self, *, name: str | None = None) -> list[dict]:
        params: dict[str, Any] = {"limit": 100}
        if name:
            params["name"] = name
        response = self._request("GET", f"{self._api_base}/signing-services/", params=params)
        return response.json()["results"]

    def get_signing_service_by_name(self, name: str) -> dict | None:
        results = self.list_signing_services(name=name)
        return results[0] if results else None

    # --- RPM repositories -----------------------------------------------------

    def get_rpm_repository(self, href: str) -> dict:
        return self._request("GET", href).json()

    def list_rpm_repositories(self, *, limit: int = 100, offset: int = 0) -> dict:
        """VERIFIED live (docs/signing.md): `package_signing_service` and
        `metadata_signing_service` are NOT filterable query params on this
        endpoint ("Invalid Filter") despite being real fields on the
        resource - callers needing "every repository currently using
        service X" must page through everything and filter client-side."""
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        response = self._request(
            "GET", f"{self._api_base}/repositories/rpm/rpm/", params=params
        )
        return response.json()

    def update_rpm_repository_signing(
        self,
        href: str,
        *,
        package_signing_service: str | None,
        package_signing_fingerprint: str | None,
        metadata_signing_service: str | None,
    ) -> dict:
        """Returns a repository object or a task reference, depending on
        Pulp's response. Callers must support both (docs/PULP_API.md)."""
        body = {
            "package_signing_service": package_signing_service,
            "package_signing_fingerprint": package_signing_fingerprint,
            "metadata_signing_service": metadata_signing_service,
        }
        return self._request("PATCH", href, json=body).json()

    def get_task(self, href: str) -> dict:
        return self._request("GET", href).json()

    def get_status(self) -> dict:
        """Pulp's own unauthenticated health/version endpoint - used by
        ldap.apply_config_job to confirm the API process actually came back
        up after the colocated reconciler restarts it, nothing more (see
        that job's own docstring on what this can and can't verify)."""
        return self._request("GET", f"{self._api_base}/status/").json()

    def wait_for_task(self, task_href: str, *, poll_interval: float = 2.0, timeout: float = 600.0) -> dict:
        """Blocks (inside a pulpit-worker job, never an HTTP request - task
        section 12) until `task_href` leaves waiting/running. Used for the
        few places this module needs a Pulp task's *result*, not just to
        fire-and-forget it (e.g. resigning must not start swapping content
        until a fresh publish confirms exactly what the latest version
        actually contains)."""
        import time

        deadline = time.monotonic() + timeout
        while True:
            task = self.get_task(task_href)
            if task["state"] in ("completed", "failed", "canceled"):
                return task
            if time.monotonic() > deadline:
                raise PulpAdapterError(f"Timed out waiting for task {task_href}")
            time.sleep(poll_interval)

    # --- Publications (native metadata (re)generation/signing) ---------------

    def create_publication(self, repository_href: str) -> dict:
        return self._request(
            "POST", f"{self._api_base}/publications/rpm/rpm/", json={"repository": repository_href}
        ).json()

    # --- Distributions (needed to actually fetch package bytes - see
    # resign_repository_packages_job / docs/signing.md "How resigning
    # actually downloads a package") ---------------------------------------

    def list_distributions_for_repository(self, repository_href: str) -> list[dict]:
        response = self._request(
            "GET", f"{self._api_base}/distributions/rpm/rpm/", params={"repository": repository_href}
        )
        return response.json()["results"]

    # --- Raw content-app fetches (repodata, package files) - VERIFIED live
    # (docs/signing.md): a package's real served path is NOT its own
    # `location_href` field taken at face value for a repository using the
    # default layout - it must be read from the repository's own published
    # primary.xml.gz (`Packages/<letter>/<file>`), the same way a real dnf
    # client resolves it. ---------------------------------------------------

    def get_content_bytes(self, url: str) -> bytes:
        # Pulp distributions advertise the public content origin. Route the
        # known content path through the configured internal Pulp origin;
        # never send service credentials to a host supplied in metadata.
        parsed = urlsplit(url)
        if parsed.path.startswith("/pulp/content/"):
            url = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        with self._client() as client:
            try:
                response = client.get(self._url(url))
            except httpx.HTTPError as exc:
                raise PulpAdapterError(f"Pulp content request failed: {exc}") from exc
        if response.status_code >= 400:
            raise PulpAdapterError(
                f"Pulp content request returned {response.status_code} for {url}",
                status_code=response.status_code,
            )
        return response.content

    # --- RPM package content ---------------------------------------------

    def list_rpm_packages(
        self, *, repository_version: str, limit: int = 100, offset: int = 0
    ) -> dict:
        response = self._request(
            "GET",
            f"{self._api_base}/content/rpm/packages/",
            params={"repository_version": repository_version, "limit": limit, "offset": offset},
        )
        return response.json()

    def upload_rpm_package(self, filename: str, content: bytes) -> dict:
        """Sync (VERIFIED, docs/PULP_API.md): creates the content unit only,
        no `repository` field - adding it to a repository is the separate
        `modify_rpm_repository` call below."""
        response = self._request(
            "POST",
            f"{self._api_base}/content/rpm/packages/upload/",
            files={"file": (filename, content)},
        )
        return response.json()

    def modify_rpm_repository(
        self, repository_href: str, *, add_content_units: list[str], remove_content_units: list[str]
    ) -> dict:
        body: dict[str, list[str]] = {}
        if add_content_units:
            body["add_content_units"] = add_content_units
        if remove_content_units:
            body["remove_content_units"] = remove_content_units
        return self._request("POST", f"{repository_href}modify/", json=body).json()

    # --- Generic remote listing/update (default_settings module) ---------
    #
    # VERIFIED live: `/pulp/api/v3/remotes/` unifies every plugin's remotes
    # the same way `/repositories/` and `/content/` do above - each result's
    # own `pulp_href` is already the concrete, type-specific URL (e.g.
    # ".../remotes/rpm/rpm/<id>/"), directly PATCHable with no per-plugin
    # remote-type endpoint needed to enumerate or update "every remote that
    # exists". Remote PATCH is synchronous on the verified instance
    # (200 with the updated resource).

    def list_remotes_page(self, *, limit: int, offset: int) -> dict:
        response = self._request(
            "GET",
            f"{self._api_base}/remotes/",
            params={"fields": "pulp_href,name", "limit": limit, "offset": offset},
        )
        return response.json()

    def patch_remote(self, href: str, body: dict) -> dict:
        return self._request("PATCH", href, json=body).json()

    # --- Per-plugin repository/remote/distribution creation (fixture_seed
    # module) --------------------------------------------------------------
    #
    # Unlike the generic listings above, CREATE has no cross-plugin endpoint
    # - each plugin exposes its own concrete type path (e.g. "rpm/rpm",
    # "deb/apt", "ansible/collection" for remotes vs "ansible/ansible" for
    # repositories - VERIFIED live against the `/pulp/api/v3/` root
    # listing), supplied by fixture_seed/fixtures.py per plugin.
    #
    # VERIFIED live: remote and repository creation are both SYNCHRONOUS
    # (plain 20x with the created object, never a task) for every plugin
    # fixture_seed uses. Distribution creation and repository sync are both
    # ASYNCHRONOUS (`{"task": <href>}`) - callers must `wait_for_task`.

    def create_remote(self, type_path: str, body: dict) -> dict:
        return self._request("POST", f"{self._api_base}/remotes/{type_path}/", json=body).json()

    def create_repository(self, type_path: str, body: dict) -> dict:
        return self._request(
            "POST", f"{self._api_base}/repositories/{type_path}/", json=body
        ).json()

    def sync_repository(self, repository_href: str, remote_href: str) -> dict:
        return self._request(
            "POST", f"{repository_href}sync/", json={"remote": remote_href}
        ).json()

    def create_distribution(self, type_path: str, body: dict) -> dict:
        return self._request(
            "POST", f"{self._api_base}/distributions/{type_path}/", json=body
        ).json()


@lru_cache
def _cached_client() -> PulpClient:
    return PulpClient(get_settings())


def get_pulp_client() -> PulpClient:
    return _cached_client()
