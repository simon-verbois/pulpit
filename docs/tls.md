# TLS (Administration > TLS)

Pulpit's nginx serves plain HTTP on port 8080 and HTTPS on port 8443. Production deployments will
usually terminate TLS at a reverse proxy, load balancer, or ingress and forward plain HTTP to port 8080. The built-in HTTPS listener remains useful for local access and deployments that need TLS
between the proxy and Pulpit.

Exactly one certificate is active on port 8443. Its source is either `self_signed` or `manual`.
Certificate and key files live in the dedicated `/var/lib/pulpit-tls` volume; metadata and the
installation history are shown in Administration > TLS.

## Self-signed certificate

Pulpit generates a self-signed certificate automatically on first boot when no certificate exists.
It is valid for 730 days (two years). The daily `tls.renewal_check` job replaces it automatically
when it reaches the warning window configured by `PULPIT_CORE_TLS_WARN_DAYS` (30 days by default).
No administrator action is needed for renewal.

Browsers warn about the self-signed issuer, although the connection is encrypted. Use
**Regenerate self-signed certificate** to replace the active certificate immediately, including when
switching back from a manually imported certificate.

## Manual certificate import

In the **Manual** tab, paste a PEM certificate and its matching unencrypted RSA or EC private key.
Pulpit rejects malformed PEM, an expired certificate, or a key that does not match the certificate.
After validation it atomically replaces the files used by nginx and reloads nginx.

Pulpit cannot renew an imported certificate. The Overview page warns when it approaches expiry;
import its replacement before then. When an ingress or reverse proxy terminates TLS, manage the
public certificate there and keep Pulpit's built-in self-signed certificate for port 8443, or route
the proxy to plain HTTP on port 8080.
