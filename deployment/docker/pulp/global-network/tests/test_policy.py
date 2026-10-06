"""Real proxy, HTTPS, CA rotation and managed-client integration tests."""
import asyncio
import os
import select
import socket
import ssl
import subprocess
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from pulpit_egress import context, directory, environment, install, publish, read_policy


class PolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = tempfile.TemporaryDirectory()
        os.environ["PULPIT_EGRESS_DIR"] = cls.folder.name
        cls.cert = Path(cls.folder.name) / "cert.pem"
        key = Path(cls.folder.name) / "key.pem"
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-keyout", str(key), "-out", str(cls.cert), "-subj", "/CN=origin.test", "-addext", "subjectAltName=DNS:origin.test", "-addext", "basicConstraints=critical,CA:TRUE"], check=True, capture_output=True)
        cls.proxy_requests = []

        class Origin(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                body = b"trusted metadata" if self.path == "/metadata" else b'<repomd xmlns="http://linux.duke.edu/metadata/repo"/>'
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def do_POST(self):
                self.rfile.read(int(self.headers.get("Content-Length", 0)))
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'<?xml version="1.0"?><methodResponse><params><param><value><string>' + b"x" * 43 + b'</string></value></param></params></methodResponse>')

            def log_message(self, *args):
                pass

        cls.origin = ThreadingHTTPServer(("127.0.0.1", 0), Origin)
        server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        server_context.load_cert_chain(cls.cert, key)
        cls.origin.socket = server_context.wrap_socket(cls.origin.socket, server_side=True)
        threading.Thread(target=cls.origin.serve_forever, daemon=True).start()
        cls.url = f"https://origin.test:{cls.origin.server_port}/metadata"

        class Proxy(BaseHTTPRequestHandler):
            def do_CONNECT(self):
                cls.proxy_requests.append(self.path)
                upstream = socket.create_connection(("127.0.0.1", cls.origin.server_port))
                self.send_response(200)
                self.end_headers()
                try:
                    while True:
                        readable, _, _ = select.select([self.connection, upstream], [], [], 5)
                        if not readable:
                            break
                        for source in readable:
                            try:
                                data = source.recv(65536)
                            except ConnectionResetError:
                                return
                            if not data:
                                return
                            (upstream if source is self.connection else self.connection).sendall(data)
                finally:
                    upstream.close()

            def log_message(self, *args):
                pass

        cls.proxy = ThreadingHTTPServer(("127.0.0.1", 0), Proxy)
        threading.Thread(target=cls.proxy.serve_forever, daemon=True).start()
        cls.proxy_url = f"http://127.0.0.1:{cls.proxy.server_port}"
        install()

    def setUp(self):
        publish({"proxy_url": self.proxy_url, "ca_cert": self.cert.read_text(), "tls_validation": True, "bypass_hosts": ["localhost", "127.0.0.1"]})

    @classmethod
    def tearDownClass(cls):
        cls.proxy.shutdown()
        cls.origin.shutdown()
        cls.proxy.server_close()
        cls.origin.server_close()
        cls.folder.cleanup()

    def test_requests_and_httpx_use_global_proxy_and_ca(self):
        import httpx
        import requests
        # Explicit conflicting per-client proxies cannot bypass global policy.
        self.assertEqual(requests.get(self.url, proxies={"https": "http://127.0.0.1:1"}, timeout=5).text, "trusted metadata")
        with httpx.Client(proxy="http://127.0.0.1:1") as client:
            self.assertEqual(client.get(self.url).text, "trusted metadata")
            policy = read_policy()
            policy["ca_cert"] = None
            publish(policy)
            # The same long-lived client sees CA removal on its next connection.
            with self.assertRaises(httpx.ConnectError):
                client.get(self.url)

    def test_aiohttp_and_uln_login_trust_global_ca(self):
        import aiohttp
        from aiohttp_xmlrpc.client import ServerProxy

        async def check():
            async with aiohttp.ClientSession() as session:
                async with session.get(self.url, proxy="http://127.0.0.1:1") as response:
                    self.assertEqual(await response.text(), "trusted metadata")
                # Same independent XML-RPC session used by the ULN login.
                client = ServerProxy(self.url)
                try:
                    self.assertEqual(await client.auth.login("dummy", "dummy"), "x" * 43)
                finally:
                    await client.client.close()
            import httpx
            async with httpx.AsyncClient() as client:
                self.assertEqual((await client.get(self.url)).text, "trusted metadata")
        asyncio.run(check())

    def test_child_process_uses_proxy_and_ca_without_manual_env(self):
        result = subprocess.run(["curl", "--fail", "--silent", "--show-error", "--max-time", "5", self.url], check=True, capture_output=True)
        self.assertEqual(result.stdout, b"trusted metadata")

    def test_public_bundle_does_not_retain_removed_ca(self):
        policy = read_policy()
        policy["ca_cert"] = None
        publish(policy)
        self.assertNotIn(self.cert.read_text().strip(), Path(read_policy()["ca_bundle"]).read_text())
        self.assertEqual(context(read_policy()).verify_mode, ssl.CERT_REQUIRED)

    def test_rotation_prunes_only_expired_unused_bundles(self):
        previous = Path(read_policy()["ca_bundle"])
        expired = directory() / "ca-expired.pem"
        recent = directory() / "ca-recent.pem"
        expired.write_text("old")
        recent.write_text("old")
        os.utime(expired, (0, 0))
        os.utime(previous, (0, 0))
        policy = read_policy()
        policy["ca_cert"] = None
        publish(policy)
        self.assertFalse(expired.exists())
        self.assertTrue(recent.exists())
        # Still referenced by clients that read the manifest before rotation.
        self.assertTrue(previous.exists())
        recent.unlink()

    def test_private_manifest_and_public_bundle_permissions(self):
        self.assertEqual((directory() / "policy.json").stat().st_mode & 0o777, 0o640)
        self.assertEqual(Path(read_policy()["ca_bundle"]).stat().st_mode & 0o777, 0o644)
        self.assertTrue(self.proxy_requests)

    def test_removed_proxy_clears_inherited_environment(self):
        policy = read_policy()
        policy["proxy_url"] = ""
        values = environment(policy, {"ALL_PROXY": "http://old", "https_proxy": "http://old"})
        self.assertEqual(values["https_proxy"], "")
        self.assertNotIn("ALL_PROXY", values)


if __name__ == "__main__":
    unittest.main()
