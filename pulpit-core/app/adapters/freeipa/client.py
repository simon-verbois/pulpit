"""FreeIPA JSON-RPC adapter for the tls module's FreeIPA provider
(app/modules/tls/).

Uses password/session-cookie auth (POST username+password to
/ipa/session/login_password, then JSON-RPC calls to /ipa/session/json with
the resulting `ipa_session` cookie plus a matching Referer header - FreeIPA
rejects a JSON-RPC call without one, a CSRF-style check), deliberately NOT
Kerberos/GSSAPI/keytabs. This avoids ticket management, keytab distribution,
and DNS SRV requirements inside the container entirely, at the cost of the
automation account's password living in this database (Fernet-encrypted at
rest, app/core/crypto.py) instead of a keytab file - the tradeoff that made a
functional FreeIPA provider feasible at all rather than "ultra complex".

IMPORTANT: the JSON-RPC method names/parameter shapes used here and by
app/modules/tls/freeipa_wizard.py (cert_request, service_add, user_add,
role_add, privilege_add, caacl_add*, ...) are modeled from FreeIPA's own
documented command-line API (`ipa <command> --help` shares its parameter
names with the JSON-RPC method of the same name) and public references for
non-Kerberos automation - they have NOT been VERIFIED against a live
FreeIPA server in this codebase (no such server was available to test
against, unlike this project's other "VERIFIED live" adapters). Treat this
client as a solid, documented starting point, not a guarantee: FreeIPA's own
rejection message is always surfaced as-is (FreeIPAAdapterError) to help
diagnose a mismatch, and docs/tls.md's manual-mode instructions are the
fallback that needs no code change to work around one.
"""

import httpx

from app.adapters.freeipa.exceptions import FreeIPAAdapterError, FreeIPAAuthError


class FreeIPAClient:
    def __init__(self, base_url: str, *, verify_tls: bool = True, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.verify_tls = verify_tls
        self.timeout = timeout

    def login(self, username: str, password: str) -> str:
        """Returns the `ipa_session` cookie value."""
        url = f"{self.base_url}/ipa/session/login_password"
        try:
            response = httpx.post(
                url,
                data={"user": username, "password": password},
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "text/plain",
                    "Referer": f"{self.base_url}/ipa",
                },
                verify=self.verify_tls,
                timeout=self.timeout,
            )
        except httpx.HTTPError as exc:
            raise FreeIPAAdapterError(f"Could not reach FreeIPA at {self.base_url}: {exc}") from exc

        if response.status_code != 200:
            raise FreeIPAAuthError(
                f"FreeIPA login failed ({response.status_code}): {response.text[:500]}"
            )
        cookie = response.cookies.get("ipa_session")
        if not cookie:
            raise FreeIPAAuthError("FreeIPA login did not return a session cookie.")
        return cookie

    def change_password(self, username: str, old_password: str, new_password: str) -> None:
        """POSTs to FreeIPA's own /ipa/session/change_password endpoint - the
        same one its web UI uses when a user must change an expired
        password. Needed because a freshly `user_add --password`-created
        account's password is flagged as expired on first use (FreeIPA
        forces a reset before it can be used for anything else) - this sets
        a permanent one immediately so the account is usable
        non-interactively right away, without an interactive Kerberos
        kinit/kpasswd dance."""
        url = f"{self.base_url}/ipa/session/change_password"
        try:
            response = httpx.post(
                url,
                data={
                    "user": username,
                    "old_password": old_password,
                    "new_password": new_password,
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Referer": f"{self.base_url}/ipa",
                },
                verify=self.verify_tls,
                timeout=self.timeout,
            )
        except httpx.HTTPError as exc:
            raise FreeIPAAdapterError(f"Could not reach FreeIPA at {self.base_url}: {exc}") from exc

        # Modeled from FreeIPA's documented behavior only (not live-verified
        # here): a successful change responds 200 with no
        # X-IPA-Rejection-Reason header; a rejection (wrong old password,
        # policy violation) still responds 200 but sets that header rather
        # than a 4xx/5xx status.
        rejection = response.headers.get("X-IPA-Rejection-Reason")
        if response.status_code != 200 or rejection:
            raise FreeIPAAdapterError(
                f"FreeIPA password change failed: {rejection or response.text[:500]}"
            )

    def call(
        self,
        session_cookie: str,
        method: str,
        args: list | None = None,
        kwargs: dict | None = None,
    ) -> dict:
        """Generic JSON-RPC call - used both by request_cert below and
        directly by the setup wizard's orchestration
        (app/modules/tls/freeipa_wizard.py) for the handful of admin-only
        commands (service_add, user_add, role_add, ...) each called exactly
        once, which don't warrant their own named wrapper here."""
        url = f"{self.base_url}/ipa/session/json"
        payload = {"method": method, "params": [args or [], kwargs or {}]}
        try:
            response = httpx.post(
                url,
                json=payload,
                headers={"Referer": f"{self.base_url}/ipa", "Accept": "application/json"},
                cookies={"ipa_session": session_cookie},
                verify=self.verify_tls,
                timeout=self.timeout,
            )
        except httpx.HTTPError as exc:
            raise FreeIPAAdapterError(f"Could not reach FreeIPA at {self.base_url}: {exc}") from exc

        if response.status_code != 200:
            raise FreeIPAAdapterError(
                f"FreeIPA JSON-RPC call {method!r} failed ({response.status_code}): "
                f"{response.text[:500]}"
            )
        body = response.json()
        error = body.get("error")
        if error:
            message = error.get("message", error) if isinstance(error, dict) else error
            raise FreeIPAAdapterError(f"FreeIPA rejected {method!r}: {message}")
        return body.get("result", {})

    def request_cert(
        self,
        session_cookie: str,
        *,
        csr_pem: str,
        principal: str,
        ca: str,
        profile: str | None,
    ) -> dict:
        kwargs: dict = {"principal": principal, "cacn": ca}
        if profile:
            kwargs["profile_id"] = profile
        return self.call(session_cookie, "cert_request", [csr_pem], kwargs)
