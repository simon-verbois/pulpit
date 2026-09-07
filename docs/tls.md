# TLS (Administration > TLS)

Pulpit's nginx serves both plain HTTP (`PULPIT_HTTP_PORT`, default 8080 - unchanged) and HTTPS
(`PULPIT_HTTPS_PORT`, default 8443, purely additive). Exactly one certificate is active for 8443 at
a time - its `source` is one of `self_signed`, `manual`, or `freeipa`. Switching source (e.g. manual
→ FreeIPA) replaces the active certificate; every past install/renewal/expiry event is kept in a
history table (`GET /api/v1/tls/history`, shown on the TLS tab).

## Self-signed (zero-config default)

Generated automatically on first boot if nothing else is configured (`app/modules/tls/
bootstrap_selfsigned.py`), and auto-renewed by the scheduled `tls.renewal_check` job (daily) once it
comes within `PULPIT_CORE_TLS_WARN_DAYS` (default 30) of expiring - no administrator action needed.
Browsers will show a certificate warning (expected for a self-signed certificate); the connection is
still encrypted. "Regenerate self-signed certificate" on the TLS tab replaces it on demand (e.g.
switching back from a manual/FreeIPA certificate).

## Manual upload

Paste a PEM certificate and its matching unencrypted private key (RSA or EC) into the Manual sub-tab.
Validated synchronously (mismatched key/cert, unparseable PEM, or an already-expired certificate are
all rejected with a specific reason, not a generic error) and installed immediately - no job queue
involved, since there's no external call and the private key must never transit through the `jobs`
table even momentarily (see `app/modules/tls/manual.py`'s docstring). A manual certificate is **not**
auto-renewed - there is no key material pulpit-core could regenerate on your behalf - so the Overview
page's warning is the only signal you'll get as it nears expiry; re-upload a new one before then.

## FreeIPA

FreeIPA integration uses **password/session-cookie JSON-RPC auth** (login to
`/ipa/session/login_password`, then calls to `/ipa/session/json` with the resulting session cookie),
deliberately **not** Kerberos/GSSAPI/keytabs. This avoids ticket management, keytab distribution, and
DNS SRV requirements inside the container entirely - the tradeoff is that the automation account's
password lives in Pulpit's own database (Fernet-encrypted at rest, `app/core/crypto.py`), not a
keytab file.

> **Not verified against a live FreeIPA server.** The JSON-RPC method names and parameter shapes used
> here (`cert_request`, `service_add`, `user_add`, `role_add`, `privilege_add`, `caacl_add*`, ...) are
> modeled from FreeIPA's own documented command-line API (`ipa <command> --help` shares its parameter
> names with the JSON-RPC method of the same name) and public references for non-Kerberos
> automation - unlike this project's other adapters (Pulp, LDAP), no live FreeIPA instance was
> available to test against while building this. If a specific FreeIPA version/deployment rejects a
> call, FreeIPA's own error message is always surfaced as-is to help diagnose the mismatch. Treat this
> as a solid starting point to verify against your own instance, not a guarantee.

### Guided setup (wizard)

The wizard accepts your IPA **administrator** username/password for the duration of a single request
only - never persisted, never logged, never enqueued as a job (a job payload is a database table, and
an admin credential must never be written there even momentarily). It uses those credentials once to:

1. Create the target service principal (`service-add <principal> --force` - `--force` allows a
   principal not backed by a pre-existing enrolled host, since Pulpit itself is not IPA-enrolled).
2. Create a **new, dedicated** automation account (never reuses an existing one) with a temporary
   password, then immediately sets a permanent one via FreeIPA's own `/ipa/session/change_password`
   endpoint (the same one its web UI uses when a fresh account's password is flagged as expired on
   first use - this avoids any interactive Kerberos `kinit`/`kpasswd` step).
3. Create a privilege granting only the built-in **"Request Certificate"** permission, a role
   attaching that privilege to the new account, and a CA ACL scoping the grant to exactly this one
   service principal + certificate profile + CA - least privilege: the account can request a
   certificate for this one principal, nothing else.
4. Save only the new account's own username/password into Pulpit's settings. Your admin credentials
   are discarded the moment the request returns.

Every step reports its own status (`created` / `already_exists` / `failed`) so a partial failure is
never silent. If your FreeIPA deployment's permission model differs from what's assumed above (see
the caveat), a step will fail with FreeIPA's own error message - fix that specific IPA-side object by
hand (`ipa` CLI or the web UI) and re-run the wizard, or fall back to manual setup below.

### Manual setup

If you'd rather not hand Pulpit an admin password even transiently, or the wizard's assumptions don't
match your deployment, run the equivalent commands yourself as an IPA administrator (`kinit admin`
first), then paste the resulting account's credentials into the FreeIPA sub-tab's settings form:

```sh
# 1. The service principal certificates will be issued for.
ipa service-add HTTP/pulpit.example.com@EXAMPLE.COM --force

# 2. A dedicated automation account (never reuse an existing user/service account).
ipa user-add svc-pulpit-tls --first=Pulpit --last="TLS Automation" --password
# (enter a temporary password when prompted; log into the FreeIPA web UI once as
#  this account to set its permanent password - or use `ipa passwd svc-pulpit-tls`
#  interactively - before saving it into Pulpit)

# 3. Least-privilege grant: only "Request Certificate", only for this one principal/profile/CA.
ipa privilege-add "Pulpit TLS Cert Requester (pulpit.example.com)"
ipa privilege-add-permission "Pulpit TLS Cert Requester (pulpit.example.com)" \
    --permission="Request Certificate"
ipa role-add "Pulpit TLS Cert Requester (pulpit.example.com)"
ipa role-add-privilege "Pulpit TLS Cert Requester (pulpit.example.com)" \
    --privilege="Pulpit TLS Cert Requester (pulpit.example.com)"
ipa role-add-member "Pulpit TLS Cert Requester (pulpit.example.com)" --users=svc-pulpit-tls

ipa caacl-add pulpit-tls-pulpit.example.com
ipa caacl-add-service pulpit-tls-pulpit.example.com --services=HTTP/pulpit.example.com@EXAMPLE.COM
ipa caacl-add-profile pulpit-tls-pulpit.example.com --certprofiles=caIPAserviceCert
ipa caacl-add-ca pulpit-tls-pulpit.example.com --cas=ipa
```

Then, in the FreeIPA sub-tab's settings form, fill in: base URL, common name (the hostname the
certificate covers, e.g. `pulpit.example.com`), the service principal from step 1, the automation
account's username/password from step 2, and the CA/profile from step 3 (`ipa` / `caIPAserviceCert`
if you used the defaults above). "Test connection" confirms the account can log in before you enable
auto-renewal.

### Renewal

`renew_before_days` (default 30, admin-configurable) controls how far ahead of expiry the scheduled
`tls.renewal_check` heartbeat re-requests a certificate, the same way the "Request certificate" button
does manually - FreeIPA has no separate "renew" call; a fresh `cert_request` with a new CSR is how
both are done. A renewal failure (IPA unreachable, the account's permissions revoked, ...) is logged
and reported but never taken as a reason to remove the still-valid active certificate; the Overview
page's warning keeps surfacing the situation until it's fixed. Turn `auto_renew_enabled` off to
require a manual "Request certificate" click every time instead.
