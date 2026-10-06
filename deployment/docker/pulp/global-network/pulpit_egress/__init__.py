"""Live policy for managed Python HTTP clients and their child processes.

The private manifest is atomically published by pulpit-core. A missing manifest
is a deployment error when PULPIT_EGRESS_REQUIRED is set, never a silent bypass.
"""
import hashlib
import ipaddress
import json
import os
import ssl
import tempfile
from pathlib import Path
from urllib.parse import quote, urlsplit

DEFAULT_DIR = "/var/lib/pulpit-egress"


def directory():
    return Path(os.environ.get("PULPIT_EGRESS_DIR", DEFAULT_DIR))


def read_policy():
    try:
        data = json.loads((directory() / "policy.json").read_text())
    except FileNotFoundError:
        if os.environ.get("PULPIT_EGRESS_REQUIRED") == "true":
            raise RuntimeError("Global network policy is unavailable; check the shared egress volume") from None
        return None
    if data.get("version") != 1:
        raise RuntimeError("Unsupported global network policy version")
    return data


def _atomic(path, contents, mode):
    fd, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, "w") as handle:
            handle.write(contents)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def publish(policy):
    folder = directory()
    folder.mkdir(parents=True, exist_ok=True)
    pristine = folder / "public-ca-bundle.pem"
    if not pristine.exists():
        import certifi
        base = ssl.get_default_verify_paths().cafile or certifi.where()
        _atomic(pristine, Path(base).read_text() if base else "", 0o644)
    bundle = pristine.read_text()
    bundle += "\n" + (policy.get("ca_cert") or "")
    digest = hashlib.sha256(bundle.encode()).hexdigest()
    bundle_path = folder / f"ca-{digest}.pem"
    if not bundle_path.exists():
        _atomic(bundle_path, bundle, 0o644)
    try:
        previous = Path(json.loads((folder / "policy.json").read_text())["ca_bundle"])
    except (FileNotFoundError, KeyError, ValueError):
        previous = None
    policy = dict(policy, version=1, ca_bundle=str(bundle_path))
    _atomic(folder / "policy.json", json.dumps(policy), 0o640)
    _prune_bundles(folder, keep={bundle_path, previous})


# Child processes started just before a rotation may still read the old path.
BUNDLE_GRACE_SECONDS = 3600


def _prune_bundles(folder, keep):
    import time
    cutoff = time.time() - BUNDLE_GRACE_SECONDS
    for old in folder.glob("ca-*.pem"):
        try:
            if old not in keep and old.stat().st_mtime < cutoff:
                old.unlink()
        except FileNotFoundError:
            pass


def is_internal(url, policy):
    host = urlsplit(str(url)).hostname
    if not host:
        return True
    if host.lower() in policy.get("bypass_hosts", []):
        return True
    try:
        address = ipaddress.ip_address(host)
        return address.is_loopback
    except ValueError:
        return False


_contexts = {}


def context(policy, client_key=None, client_cert=None):
    identity = hashlib.sha256(((client_key or "") + (client_cert or "")).encode()).hexdigest()
    key = (policy["ca_bundle"], policy.get("tls_validation", True), identity)
    if key in _contexts:
        return _contexts[key]
    ctx = ssl.create_default_context(cafile=policy["ca_bundle"])
    if not policy.get("tls_validation", True):
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    if client_key and client_cert:
        with tempfile.NamedTemporaryFile() as key_file, tempfile.NamedTemporaryFile() as cert_file:
            key_file.write(client_key.encode())
            cert_file.write(client_cert.encode())
            key_file.flush()
            cert_file.flush()
            ctx.load_cert_chain(cert_file.name, key_file.name)
    ctx._pulpit_client_credentials = (client_key, client_cert)
    if len(_contexts) >= 4:
        _contexts.pop(next(iter(_contexts)))
    _contexts[key] = ctx
    return ctx


def proxy_url(policy):
    value = policy.get("proxy_url") or ""
    if not value or not policy.get("proxy_username"):
        return value
    parsed = urlsplit(value)
    credentials = quote(policy["proxy_username"], safe="") + ":" + quote(policy.get("proxy_password") or "", safe="")
    return parsed._replace(netloc=credentials + "@" + parsed.netloc).geturl()


def environment(policy, inherited=None):
    result = dict(os.environ if inherited is None else inherited)
    proxy = proxy_url(policy)
    for key in ("http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY"):
        result[key] = proxy
    # An inherited ALL_PROXY must not resurrect a removed proxy.
    result.pop("ALL_PROXY", None)
    result.pop("all_proxy", None)
    bypass = ",".join(policy.get("bypass_hosts", []))
    result["NO_PROXY"] = result["no_proxy"] = bypass
    for key in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE", "GIT_SSL_CAINFO"):
        result[key] = policy["ca_bundle"]
    result["GIT_SSL_NO_VERIFY"] = "false" if policy.get("tls_validation", True) else "true"
    return result


_installed = False


def install():
    """One installation per interpreter; policy is reread on each connection."""
    global _installed
    if _installed:
        return
    _installed = True
    import subprocess
    original_popen = subprocess.Popen.__init__

    def popen(self, *args, **kwargs):
        policy = read_policy()
        if policy:
            kwargs["env"] = environment(policy, kwargs.get("env"))
        return original_popen(self, *args, **kwargs)
    subprocess.Popen.__init__ = popen

    try:
        import aiohttp
    except ImportError:
        pass
    else:
        original_request = aiohttp.ClientSession._request

        async def request(self, method, url, **kwargs):
            policy = read_policy()
            if policy:
                kwargs["proxy"] = None
                kwargs["proxy_auth"] = None
                if not is_internal(url, policy):
                    kwargs["proxy"] = policy.get("proxy_url") or None
                    if kwargs["proxy"] and policy.get("proxy_username"):
                        kwargs["proxy_auth"] = aiohttp.BasicAuth(policy["proxy_username"], policy.get("proxy_password") or "")
                    connector_context = getattr(self.connector, "_ssl", None)
                    revision = (policy["ca_bundle"], policy.get("tls_validation", True))
                    credentials = getattr(connector_context, "_pulpit_client_credentials", (None, None))
                    kwargs["ssl"] = connector_context if getattr(connector_context, "_pulpit_revision", None) == revision else context(policy, *credentials)
            return await original_request(self, method, url, **kwargs)
        aiohttp.ClientSession._request = request

    try:
        import requests
    except ImportError:
        pass
    else:
        original_send = requests.Session.send

        def send(self, request, **kwargs):
            policy = read_policy()
            if policy:
                kwargs["proxies"] = {}
                if not is_internal(request.url, policy):
                    proxy = proxy_url(policy)
                    kwargs["proxies"] = {"http": proxy, "https": proxy} if proxy else {}
                    kwargs["verify"] = policy["ca_bundle"] if policy.get("tls_validation", True) else False
            return original_send(self, request, **kwargs)
        requests.Session.send = send

    try:
        import httpx
    except ImportError:
        pass
    else:
        for client_class, transport_class in ((httpx.Client, httpx.HTTPTransport), (httpx.AsyncClient, httpx.AsyncHTTPTransport)):
            original_transport = client_class._transport_for_url

            def transport(self, url, _original=original_transport, _class=transport_class):
                policy = read_policy()
                if not policy or not isinstance(self._transport, httpx.HTTPTransport | httpx.AsyncHTTPTransport):
                    return _original(self, url)
                if is_internal(url, policy):
                    return self._transport
                # Transports remain owned by the client until close, including streams.
                cache = getattr(self, "_pulpit_egress_transports", None)
                if cache is None:
                    cache = self._pulpit_egress_transports = {}
                key = hashlib.sha256(json.dumps(policy, sort_keys=True).encode()).hexdigest()
                if key not in cache:
                    cache[key] = _class(proxy=proxy_url(policy) or None, verify=context(policy), trust_env=False)
                return cache[key]
            client_class._transport_for_url = transport
        original_close = httpx.Client.close
        original_aclose = httpx.AsyncClient.aclose

        def close(self):
            try:
                for transport in getattr(self, "_pulpit_egress_transports", {}).values():
                    transport.close()
            finally:
                original_close(self)

        async def aclose(self):
            try:
                for transport in getattr(self, "_pulpit_egress_transports", {}).values():
                    await transport.aclose()
            finally:
                await original_aclose(self)
        httpx.Client.close = close
        httpx.AsyncClient.aclose = aclose


def install_pulp_factory():
    """Preserve origin credentials and mTLS, replace obsolete per-remote policy."""
    import copy

    from pulpcore.download.factory import DownloaderFactory

    original = DownloaderFactory._make_aiohttp_session_from_remote
    if getattr(original, "_pulpit_global", False):
        return

    def session(factory):
        policy = read_policy()
        if not policy:
            return original(factory)
        remote = factory._remote = copy.copy(factory._remote)
        remote.proxy_url = policy.get("proxy_url") or None
        remote.proxy_username = policy.get("proxy_username") or None
        remote.proxy_password = policy.get("proxy_password") or None
        remote.ca_cert = policy.get("ca_cert") or None
        remote.tls_validation = policy.get("tls_validation", True)
        result = original(factory)
        ctx = context(policy, remote.client_key, remote.client_cert)
        ctx._pulpit_revision = (policy["ca_bundle"], policy.get("tls_validation", True))
        result.connector._ssl = ctx
        return result
    session._pulpit_global = True
    DownloaderFactory._make_aiohttp_session_from_remote = session
