"""Opt-in real-Pulp integration test. Run as pulp inside the derived dev image.

PULPIT_TEST_LIVE_SIGNING=1 python -m unittest discover -s <this-directory> -v
Creates its own key, services and repositories. Never changes global signing settings.
"""

import functools
import gzip
import hashlib
import http.server
import json
import os
import shlex
import shutil
import subprocess
import tempfile
import threading
import time
import unittest
import uuid
from pathlib import Path
from xml.etree import ElementTree

import requests


@unittest.skipUnless(
    os.environ.get("PULPIT_TEST_LIVE_SIGNING") == "1", "requires disposable dev Pulp"
)
class LiveSigningPolicyTest(unittest.TestCase):
    def command(self, *args, **options):
        result = subprocess.run(
            args, capture_output=True, check=False, timeout=120, **options
        )
        self.assertEqual(result.returncode, 0, f"Fixture command failed: {args[0]}")
        return result.stdout

    def api(self, method, path, **kwargs):
        response = self.session.request(
            method, f"http://localhost{path}", timeout=30, **kwargs
        )
        self.assertIn(
            response.status_code,
            (200, 201, 202, 204),
            f"API status {response.status_code}: {method} {path}",
        )
        return response.json() if response.content else {}

    def wait(self, task, expected="completed"):
        for _ in range(180):
            result = self.api("GET", task)
            if result["state"] in ("completed", "failed", "canceled", "skipped"):
                self.assertEqual(
                    result["state"], expected, "Unexpected Pulp task outcome"
                )
                return result
            time.sleep(0.5)
        self.fail("Pulp task timed out")

    def create(self, path, data):
        result = self.api("POST", path, json=data)
        if "task" in result:
            result = self.api("GET", self.wait(result["task"])["created_resources"][0])
        self.resources.append(result["pulp_href"])
        return result

    def build_rpm(self, tag):
        import rpm_rs

        path = self.root / f"fixture-{tag}.rpm"
        rpm_rs.PackageBuilder(
            f"{self.name}-{tag}", "1.0", "MIT", "noarch"
        ).build().write_file(path)
        return path

    def distribution(self, repository, suffix):
        return self.create(
            "/pulp/api/v3/distributions/rpm/rpm/",
            {
                "name": f"{self.name}-{suffix}",
                "base_path": f"rpm/{self.name}-{suffix}",
                "repository": repository["pulp_href"],
            },
        )

    def sync(self, repository, remote, expected="completed"):
        return self.wait(
            self.api(
                "POST",
                f"{repository['pulp_href']}sync/",
                json={"remote": remote["pulp_href"], "optimize": False},
            )["task"],
            expected,
        )

    def package_url(self, distro):
        base = f"http://localhost/pulp/content/{distro['base_path']}/"
        repomd = self.session.get(base + "repodata/repomd.xml", timeout=30)
        self.assertEqual(repomd.status_code, 200)
        root = ElementTree.fromstring(repomd.content)
        ns = {"r": "http://linux.duke.edu/metadata/repo"}
        path = root.find("r:data[@type='primary']/r:location", ns).attrib["href"]
        content = self.session.get(base + path, timeout=30).content
        primary = ElementTree.fromstring(
            gzip.decompress(content) if path.endswith(".gz") else content
        )
        ns = {"p": "http://linux.duke.edu/metadata/common"}
        return [
            (
                base + p.find("p:location", ns).attrib["href"],
                p.find("p:checksum", ns).text,
            )
            for p in primary.findall("p:package", ns)
        ]

    def verify_downloads(self, distro):
        packages = self.package_url(distro)
        self.assertTrue(packages)
        base = f"http://localhost/pulp/content/{distro['base_path']}/repodata/"
        metadata = self.root / "repomd.xml"
        signature = self.root / "repomd.xml.asc"
        metadata.write_bytes(self.session.get(base + "repomd.xml", timeout=30).content)
        signature.write_bytes(
            self.session.get(base + "repomd.xml.asc", timeout=30).content
        )
        self.command(
            "gpg",
            "--homedir",
            str(self.root / "verify-gnupg"),
            "--verify",
            str(signature),
            str(metadata),
        )
        for index, (url, checksum) in enumerate(packages):
            response = self.session.get(url, timeout=30)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(hashlib.sha256(response.content).hexdigest(), checksum)
            rpm = self.root / f"download-{index}.rpm"
            rpm.write_bytes(response.content)
            verification = self.command(
                "rpmkeys",
                "--dbpath",
                str(self.root / "rpmdb"),
                "--checksig",
                "--verbose",
                str(rpm),
            )
            self.assertIn(b"Signature", verification)
            self.assertIn(b": OK", verification)
        return len(packages)

    def test_sync_repair_on_demand_failure_and_cached_delivery(self):
        self.root = Path(tempfile.mkdtemp(prefix="pulpit-sign-policy-"))
        self.name = f"pulpit-policy-{uuid.uuid4().hex[:12]}"
        self.resources = []
        self.registered = []
        self.session = requests.Session()
        self.session.auth = ("admin", os.environ["PULP_ADMIN_PASSWORD"])
        self.session.trust_env = False
        server = None
        try:
            home = self.root / "gnupg"
            home.mkdir(mode=0o700)
            self.command(
                "gpg",
                "--batch",
                "--homedir",
                str(home),
                "--pinentry-mode",
                "loopback",
                "--passphrase",
                "",
                "--quick-generate-key",
                "Pulpit policy test <policy@example.invalid>",
                "rsa2048",
                "sign",
                "1d",
            )
            output = self.command(
                "gpg", "--homedir", str(home), "--with-colons", "--list-secret-keys"
            ).decode()
            fingerprint = next(
                line.split(":")[9]
                for line in output.splitlines()
                if line.startswith("fpr:")
            )
            public_key = self.root / "public.asc"
            public_key.write_bytes(
                self.command(
                    "gpg", "--homedir", str(home), "--armor", "--export", fingerprint
                )
            )
            verify_home = self.root / "verify-gnupg"
            verify_home.mkdir(mode=0o700)
            self.command(
                "gpg", "--homedir", str(verify_home), "--import", str(public_key)
            )
            self.command(
                "rpmkeys",
                "--dbpath",
                str(self.root / "rpmdb"),
                "--import",
                str(public_key),
            )
            script = self.root / "sign.sh"
            script_text = f'#!/bin/sh\nexport PULPIT_SIGNING_GNUPGHOME={shlex.quote(str(home))}\nexec /var/lib/pulpit-signing/scripts/sign_rpm_package.sh "$@"\n'
            script.write_text(script_text)
            script.chmod(0o700)
            self.command(
                "pulpcore-manager",
                "add-signing-service",
                self.name,
                str(script),
                fingerprint,
                "--class",
                "rpm:RpmPackageSigningService",
                "--home",
                str(home),
            )
            signing_service = self.api(
                "GET", "/pulp/api/v3/signing-services/", params={"name": self.name}
            )["results"][0]
            self.registered.append(self.name)
            metadata_script = self.root / "metadata.sh"
            metadata_script.write_text(
                f'#!/bin/sh\nexport PULPIT_SIGNING_GNUPGHOME={shlex.quote(str(home))}\nexec /var/lib/pulpit-signing/scripts/sign_metadata.sh "$@"\n'
            )
            metadata_script.chmod(0o700)
            self.command(
                "pulpcore-manager",
                "add-signing-service",
                self.name + "-metadata",
                str(metadata_script),
                fingerprint,
                "--class",
                "core:AsciiArmoredDetachedSigningService",
                "--home",
                str(home),
            )
            self.registered.append(self.name + "-metadata")
            metadata_service = self.api(
                "GET",
                "/pulp/api/v3/signing-services/",
                params={"name": self.name + "-metadata"},
            )["results"][0]
            signing = {
                "package_signing_service": signing_service["pulp_href"],
                "package_signing_fingerprint": f"v4:{fingerprint}",
                "metadata_signing_service": metadata_service["pulp_href"],
            }
            for tag in ("a", "b", "c"):
                target = self.root / tag
                target.mkdir()
                shutil.copyfile(self.build_rpm(tag), target / f"{tag}.rpm")
                self.command("createrepo_c", str(target))
            # A distinct upstream legacy signature must be replaced, not added to.
            self.command(
                "gpg",
                "--batch",
                "--homedir",
                str(home),
                "--pinentry-mode",
                "loopback",
                "--passphrase",
                "",
                "--quick-generate-key",
                "Upstream test <upstream@example.invalid>",
                "rsa2048",
                "sign",
                "1d",
            )
            listed = self.command(
                "gpg", "--homedir", str(home), "--with-colons", "--list-secret-keys"
            ).decode()
            vendor_key = [
                line.split(":")[9]
                for line in listed.splitlines()
                if line.startswith("fpr:")
            ][-1]
            legacy_script = self.root / "legacy-sign.sh"
            legacy_script.write_text(
                Path("/var/lib/pulpit-signing/scripts/sign_rpm_package.sh")
                .read_text()
                .replace("rpmsign \\\n", "rpmsign --rpmv3 \\\n")
            )
            legacy_script.chmod(0o700)
            self.command(
                str(legacy_script),
                str(self.root / "c" / "c.rpm"),
                env={
                    **os.environ,
                    "PULPIT_SIGNING_GNUPGHOME": str(home),
                    "PULP_SIGNING_KEY_FINGERPRINT": vendor_key,
                },
            )
            self.command("createrepo_c", str(self.root / "c"))
            shutil.copyfile(self.root / "fixture-a.rpm", self.root / "c" / "a.rpm")
            self.command("createrepo_c", str(self.root / "c"))
            handler = functools.partial(
                http.server.SimpleHTTPRequestHandler, directory=str(self.root)
            )
            server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            remotes = [
                self.create(
                    "/pulp/api/v3/remotes/rpm/rpm/",
                    {
                        "name": f"{self.name}-{tag}",
                        "url": f"http://127.0.0.1:{server.server_port}/{tag}/",
                        "policy": "on_demand",
                        "max_retries": 0,
                    },
                )
                for tag in ("a", "b", "c")
            ]

            # Exercise the browser's two-step manual upload, not only sync's
            # version-finalization hook. Native modify uses signed_add_and_remove.
            manual = self.create(
                "/pulp/api/v3/repositories/rpm/rpm/",
                {"name": f"{self.name}-upload", "autopublish": True, **signing},
            )
            manual_distro = self.distribution(manual, "upload")
            uploaded = []
            for tag in ("upload-legacy", "upload-unsigned"):
                rpm_path = self.build_rpm(tag)
                if tag == "upload-legacy":
                    self.command(
                        str(legacy_script),
                        str(rpm_path),
                        env={
                            **os.environ,
                            "PULPIT_SIGNING_GNUPGHOME": str(home),
                            "PULP_SIGNING_KEY_FINGERPRINT": vendor_key,
                        },
                    )
                with rpm_path.open("rb") as stream:
                    uploaded.append(
                        self.api(
                            "POST",
                            "/pulp/api/v3/content/rpm/packages/upload/",
                            files={
                                "file": (rpm_path.name, stream, "application/x-rpm")
                            },
                        )["pulp_href"]
                    )
            added = self.wait(
                self.api(
                    "POST",
                    manual["pulp_href"] + "modify/",
                    json={"add_content_units": uploaded},
                )["task"]
            )
            self.assertEqual(
                added["name"], "pulp_rpm.app.tasks.signing.signed_add_and_remove"
            )
            self.assertEqual(self.verify_downloads(manual_distro), 2)

            # Existing unsigned publication, warmed in Redis before enabling signing.
            legacy = self.create(
                "/pulp/api/v3/repositories/rpm/rpm/", {"name": f"{self.name}-legacy"}
            )
            self.sync(legacy, remotes[0])
            old_publication = self.wait(
                self.api(
                    "POST",
                    "/pulp/api/v3/publications/rpm/rpm/",
                    json={"repository": legacy["pulp_href"]},
                )["task"]
            )["created_resources"][0]
            legacy_distro = self.distribution(legacy, "legacy")
            old_pin = self.create(
                "/pulp/api/v3/distributions/rpm/rpm/",
                {
                    "name": self.name + "-old-pin",
                    "base_path": "rpm/" + self.name + "-old-pin",
                    "publication": old_publication,
                },
            )
            old_url = self.package_url(legacy_distro)[0][0]
            self.assertEqual(self.session.get(old_url, timeout=30).status_code, 200)
            self.api("PATCH", legacy["pulp_href"], json=signing)
            self.assertEqual(self.session.get(old_url, timeout=30).status_code, 503)
            pin_url = f"http://localhost/pulp/content/{old_pin['base_path']}/repodata/repomd.xml"
            self.assertEqual(self.session.get(pin_url, timeout=30).status_code, 503)
            self.wait(
                self.api(
                    "POST",
                    "/pulp/api/v3/publications/rpm/rpm/",
                    json={"repository": legacy["pulp_href"]},
                )["task"],
                "failed",
            )
            job_path = os.environ.get("PULPIT_TEST_CORE_JOB_PATH")
            if job_path:
                request_file, id_file = (
                    Path(job_path + ".request"),
                    Path(job_path + ".id"),
                )
                request_file.write_text(
                    json.dumps(
                        {
                            "repository_href": legacy["pulp_href"],
                            "fingerprint": fingerprint,
                            "force_publish": True,
                        }
                    )
                )
                for _ in range(120):
                    if id_file.exists():
                        break
                    time.sleep(0.5)
                self.assertTrue(
                    id_file.exists(), "Host must submit the requested core job"
                )
                job_id = id_file.read_text().strip()
                core = "http://pulpit:8080/pulpit-core/api/v1/"
                for _ in range(60):
                    try:
                        settings_response = self.session.get(
                            core + "task_retention/settings", timeout=30
                        )
                        if settings_response.status_code == 200:
                            prefs = settings_response.json()
                            break
                    except requests.ConnectionError:
                        pass
                    time.sleep(0.5)
                else:
                    self.fail("Core settings did not become available")
                writes = 0
                for _ in range(1200):
                    try:
                        response = self.session.get(core + "jobs/" + job_id, timeout=30)
                    except requests.ConnectionError:
                        time.sleep(0.5)
                        continue
                    if response.status_code in (502, 503, 504):
                        time.sleep(0.5)
                        continue
                    self.assertEqual(response.status_code, 200)
                    job = response.json()
                    if job["status"] in ("success", "failed"):
                        self.assertEqual(job["status"], "success")
                        self.assertEqual(job["result"]["engine"], "pulp")
                        break
                    if job["status"] != "running":
                        time.sleep(0.5)
                        continue
                    try:
                        saved = self.session.patch(
                            core + "task_retention/settings",
                            timeout=30,
                            json={
                                "enabled": prefs["enabled"],
                                "retention_days": prefs["retention_days"],
                            },
                        )
                        if saved.status_code in (502, 503, 504):
                            time.sleep(0.5)
                            continue
                        self.assertEqual(
                            saved.status_code,
                            200,
                            "Settings must remain writable during signing",
                        )
                    except requests.ConnectionError:
                        time.sleep(0.5)
                        continue
                    writes += 1
                    time.sleep(0.5)
                else:
                    self.fail("Core signing job timed out")
                self.assertGreater(writes, 0)
                print(f"Concurrent settings saves while signing: {writes}", flush=True)
                request_file.unlink()
                id_file.unlink()
            else:
                self.wait(
                    self.api("POST", legacy["pulp_href"] + "modify/", json={})["task"]
                )
                self.wait(
                    self.api(
                        "POST",
                        "/pulp/api/v3/publications/rpm/rpm/",
                        json={"repository": legacy["pulp_href"]},
                    )["task"]
                )
            self.assertEqual(self.verify_downloads(legacy_distro), 1)
            self.assertEqual(self.session.get(pin_url, timeout=30).status_code, 503)

            # New on-demand content is materialized and signed before autopublish.
            fresh = self.create(
                "/pulp/api/v3/repositories/rpm/rpm/",
                {"name": f"{self.name}-fresh", "autopublish": True, **signing},
            )
            fresh_distro = self.distribution(fresh, "fresh")
            self.sync(fresh, remotes[1])
            self.assertEqual(self.verify_downloads(fresh_distro), 1)
            version = self.api("GET", fresh["pulp_href"])["latest_version_href"]

            # A broken signer must preserve the last safe publication/version.
            script.write_text("#!/bin/sh\nexit 42\n")
            failed_task = self.sync(fresh, remotes[2], "failed")
            self.assertIn("RPM signing failed", failed_task["error"]["description"])
            self.assertEqual(
                self.api("GET", fresh["pulp_href"])["latest_version_href"], version
            )
            self.assertEqual(self.verify_downloads(fresh_distro), 1)
            script.write_text(script_text)
            self.sync(fresh, remotes[2])
            self.assertEqual(self.verify_downloads(fresh_distro), 3)
        finally:
            if server:
                server.shutdown()
                server.server_close()
            for href in reversed(self.resources):
                result = self.api("DELETE", href)
                if result.get("task"):
                    self.wait(result["task"])
            for service_name in reversed(self.registered):
                self.command("pulpcore-manager", "remove-signing-service", service_name)
            self.command("gpgconf", "--homedir", str(home), "--kill", "gpg-agent")
            job_path = os.environ.get("PULPIT_TEST_CORE_JOB_PATH")
            if job_path:
                Path(job_path + ".request").unlink(missing_ok=True)
                Path(job_path + ".id").unlink(missing_ok=True)
            self.session.close()
            shutil.rmtree(self.root)


if __name__ == "__main__":
    unittest.main()
