"""Synthetic ULN endpoint: dummy login, RPM metadata, optional response delays.

Use only with disposable remotes and dummy credentials. Request bodies are
discarded without logging them; this fixture does not contact Oracle.
"""

import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from xmlrpc.client import dumps


class Handler(BaseHTTPRequestHandler):
    def reply(self, content, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        try:
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionResetError):
            # Expected when the probe cancels before the delayed response.
            print("Client disconnected before the delayed response", flush=True)

    def do_POST(self):
        if self.path != "/rpc/api":
            self.send_error(404)
            return
        self.rfile.read(int(self.headers.get("Content-Length", "0")))
        delay = float(os.environ.get("ULN_FIXTURE_LOGIN_DELAY", "0"))
        print(f"ULN login: delaying response {delay}s", flush=True)
        time.sleep(delay)
        self.reply(dumps(("x" * 43,), methodresponse=True).encode(), "text/xml")

    def do_GET(self):
        if self.path != "/XMLRPC/GET-REQ/test-channel/repodata/repomd.xml":
            self.send_error(404)
            return
        delay = float(os.environ.get("ULN_FIXTURE_METADATA_DELAY", "0"))
        print(f"ULN metadata: delaying response {delay}s", flush=True)
        time.sleep(delay)
        self.reply(
            b'<?xml version="1.0"?><repomd xmlns="http://linux.duke.edu/metadata/repo"/>',
            "application/xml",
        )


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 80), Handler).serve_forever()
