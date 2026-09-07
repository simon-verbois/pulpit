"""FreeIPA setup wizard orchestration.

One-time IPA ADMIN credentials, accepted only for the duration of a single
request (routes/freeipa.py's wizard endpoint), are used here to create the
IPA-side objects a dedicated, least-privilege automation account needs to
request a certificate for one specific service principal: the service
principal itself, a fresh automation user, a privilege/role granting it only
"Request Certificate", and a CA ACL scoping that down to this one service +
profile + CA. The admin credentials are never persisted, logged, or passed
into a job payload (a database table) - only the resulting automation
account's own credentials are returned to the caller, which saves them via
freeipa_settings.update_settings.

See app/adapters/freeipa/client.py's module docstring for the important
caveat that the exact JSON-RPC method names/parameter shapes below are
modeled from FreeIPA's documented API, NOT verified against a live server.
Each step's own FreeIPA-reported error is preserved in the result so a
mismatch is diagnosable; docs/tls.md's manual-mode instructions are the
fallback that needs no code change to work around one.
"""

import secrets

from app.adapters.freeipa import FreeIPAAdapterError, FreeIPAClient


def _step(steps: list[dict], name: str, status: str, detail: str = "") -> None:
    steps.append({"step": name, "status": status, "detail": detail})


def _already_exists(exc: Exception) -> bool:
    return "already exists" in str(exc).lower()


def run_wizard_setup(
    *,
    base_url: str,
    verify_tls: bool,
    admin_username: str,
    admin_password: str,
    common_name: str,
    target_principal: str,
    service_account_username: str,
    ca: str,
    profile: str | None,
) -> tuple[bool, list[dict], str | None]:
    """Returns (success, steps, service_account_password) - the password is
    returned ONLY so routes/freeipa.py can encrypt-and-store it immediately;
    it must never be logged or included in the HTTP response body."""
    client = FreeIPAClient(base_url, verify_tls=verify_tls)
    steps: list[dict] = []
    privilege_name = f"Pulpit TLS Cert Requester ({common_name})"
    role_name = f"Pulpit TLS Cert Requester ({common_name})"
    acl_name = f"pulpit-tls-{common_name}"
    effective_profile = profile or "caIPAserviceCert"

    try:
        session = client.login(admin_username, admin_password)
    except FreeIPAAdapterError as exc:
        _step(steps, "Authenticate as the IPA administrator", "failed", str(exc))
        return False, steps, None
    _step(steps, "Authenticate as the IPA administrator", "created")

    try:
        client.call(session, "service_add", [target_principal], {"force": True})
        _step(steps, f'Create service "{target_principal}"', "created")
    except FreeIPAAdapterError as exc:
        if _already_exists(exc):
            _step(steps, f'Create service "{target_principal}"', "already_exists", str(exc))
        else:
            _step(steps, f'Create service "{target_principal}"', "failed", str(exc))
            return False, steps, None

    temp_password = secrets.token_urlsafe(24)
    try:
        client.call(
            session,
            "user_add",
            [service_account_username],
            {"givenname": "Pulpit", "sn": "TLS Automation", "userpassword": temp_password},
        )
        _step(steps, f'Create automation account "{service_account_username}"', "created")
    except FreeIPAAdapterError as exc:
        _step(
            steps,
            f'Create automation account "{service_account_username}"',
            "failed",
            f"{exc} (choose a different account name, or use manual mode)",
        )
        return False, steps, None

    permanent_password = secrets.token_urlsafe(32)
    try:
        client.change_password(service_account_username, temp_password, permanent_password)
        _step(steps, "Set the automation account's permanent password", "created")
    except FreeIPAAdapterError as exc:
        _step(steps, "Set the automation account's permanent password", "failed", str(exc))
        return False, steps, None

    try:
        client.call(session, "privilege_add", [privilege_name], {})
        _step(steps, f'Create privilege "{privilege_name}"', "created")
    except FreeIPAAdapterError as exc:
        if _already_exists(exc):
            _step(steps, f'Create privilege "{privilege_name}"', "already_exists", str(exc))
        else:
            _step(steps, f'Create privilege "{privilege_name}"', "failed", str(exc))
            return False, steps, permanent_password

    try:
        client.call(
            session, "privilege_add_permission", [privilege_name], {"permission": "Request Certificate"}
        )
        _step(steps, 'Grant "Request Certificate" to the privilege', "created")
    except FreeIPAAdapterError as exc:
        if _already_exists(exc):
            _step(steps, 'Grant "Request Certificate" to the privilege', "already_exists", str(exc))
        else:
            _step(steps, 'Grant "Request Certificate" to the privilege', "failed", str(exc))
            return False, steps, permanent_password

    try:
        client.call(session, "role_add", [role_name], {})
        _step(steps, f'Create role "{role_name}"', "created")
    except FreeIPAAdapterError as exc:
        if _already_exists(exc):
            _step(steps, f'Create role "{role_name}"', "already_exists", str(exc))
        else:
            _step(steps, f'Create role "{role_name}"', "failed", str(exc))
            return False, steps, permanent_password

    try:
        client.call(session, "role_add_privilege", [role_name], {"privilege": privilege_name})
        _step(steps, "Attach the privilege to the role", "created")
    except FreeIPAAdapterError as exc:
        if _already_exists(exc):
            _step(steps, "Attach the privilege to the role", "already_exists", str(exc))
        else:
            _step(steps, "Attach the privilege to the role", "failed", str(exc))
            return False, steps, permanent_password

    try:
        client.call(session, "role_add_member", [role_name], {"user": service_account_username})
        _step(steps, "Add the automation account to the role", "created")
    except FreeIPAAdapterError as exc:
        _step(steps, "Add the automation account to the role", "failed", str(exc))
        return False, steps, permanent_password

    try:
        client.call(session, "caacl_add", [acl_name], {})
        _step(steps, f'Create CA ACL "{acl_name}"', "created")
    except FreeIPAAdapterError as exc:
        if _already_exists(exc):
            _step(steps, f'Create CA ACL "{acl_name}"', "already_exists", str(exc))
        else:
            _step(steps, f'Create CA ACL "{acl_name}"', "failed", str(exc))
            return False, steps, permanent_password

    try:
        client.call(session, "caacl_add_service", [acl_name], {"service": [target_principal]})
        _step(steps, "Scope the CA ACL to the target service", "created")
    except FreeIPAAdapterError as exc:
        _step(steps, "Scope the CA ACL to the target service", "failed", str(exc))
        return False, steps, permanent_password

    try:
        client.call(session, "caacl_add_profile", [acl_name], {"certprofile": [effective_profile]})
        _step(steps, "Scope the CA ACL to the certificate profile", "created")
    except FreeIPAAdapterError as exc:
        _step(steps, "Scope the CA ACL to the certificate profile", "failed", str(exc))
        return False, steps, permanent_password

    try:
        client.call(session, "caacl_add_ca", [acl_name], {"ca": [ca]})
        _step(steps, "Scope the CA ACL to the CA", "created")
    except FreeIPAAdapterError as exc:
        _step(steps, "Scope the CA ACL to the CA", "failed", str(exc))
        return False, steps, permanent_password

    return True, steps, permanent_password
