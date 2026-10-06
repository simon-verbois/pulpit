"""Root-owned reconciliation of the public CA into the container trust store."""
import logging
import subprocess
import time
from pathlib import Path

from . import _atomic, read_policy

_last_applied = None


def reconcile(certificate):
    global _last_applied
    redhat = Path("/etc/pki/ca-trust/source/anchors")
    folder = redhat if redhat.exists() else Path("/usr/local/share/ca-certificates")
    target = folder / "pulpit-global-proxy.crt"
    current = target.read_text() if target.exists() else ""
    desired = certificate or ""
    if current == desired and _last_applied == desired:
        return
    if desired:
        _atomic(target, desired, 0o644)
    else:
        target.unlink(missing_ok=True)
    command = ["update-ca-trust", "extract"] if redhat.exists() else ["update-ca-certificates"]
    subprocess.run(command, check=True, capture_output=True)
    _last_applied = desired


def main():
    logging.basicConfig(level=logging.INFO)
    while True:
        try:
            policy = read_policy()
            if policy:
                reconcile(policy.get("ca_cert"))
        except Exception:
            logging.exception("Could not reconcile the global CA into the container trust store")
        time.sleep(2)
