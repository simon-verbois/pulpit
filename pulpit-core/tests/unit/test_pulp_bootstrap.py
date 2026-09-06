import json

from app.modules.signing.models import PulpServicePurpose
from app.modules.signing.pulp_bootstrap import (
    build_bootstrap_command,
    build_manifest_entry,
    write_signing_services_manifest,
)

GNUPG_HOME = "/var/lib/pulpit-signing/gnupg"


def test_package_bootstrap_command_uses_rpm_signing_class():
    command = build_bootstrap_command(
        purpose=PulpServicePurpose.PACKAGE,
        service_name="Pulp RPM Signing Service",
        fingerprint="A" * 40,
        scripts_dir="/var/lib/pulpit-signing/scripts",
        gnupg_home=GNUPG_HOME,
    )
    assert "add-signing-service" in command
    assert "'Pulp RPM Signing Service'" in command
    assert "/var/lib/pulpit-signing/scripts/sign_rpm_package.sh" in command
    assert "A" * 40 in command
    assert "rpm:RpmPackageSigningService" in command
    # BUG FOUND LIVE: without --home, add-signing-service looks in the
    # invoking shell's own default ~/.gnupg (empty) and fails outright.
    assert f"--home {GNUPG_HOME}" in command


def test_metadata_bootstrap_command_uses_core_detached_class():
    command = build_bootstrap_command(
        purpose=PulpServicePurpose.METADATA,
        service_name="Pulp Metadata Signing Service (ABCD1234)",
        fingerprint="B" * 40,
        scripts_dir="/var/lib/pulpit-signing/scripts",
        gnupg_home=GNUPG_HOME,
    )
    assert "sign_metadata.sh" in command
    assert "core:AsciiArmoredDetachedSigningService" in command
    assert f"--home {GNUPG_HOME}" in command


def test_bootstrap_command_shell_quotes_service_name_with_spaces():
    command = build_bootstrap_command(
        purpose=PulpServicePurpose.PACKAGE,
        service_name="a name; rm -rf /",
        fingerprint="C" * 40,
        scripts_dir="/scripts",
        gnupg_home=GNUPG_HOME,
    )
    # shlex.quote must wrap the malicious-looking name so a copy-paste into
    # a shell treats it as one literal argument, not a second command.
    assert "'a name; rm -rf /'" in command


def test_manifest_entry_uses_rpm_signing_class():
    entry = build_manifest_entry(
        purpose=PulpServicePurpose.PACKAGE,
        service_name="Pulp RPM Signing Service",
        fingerprint="A" * 40,
        scripts_dir="/var/lib/pulpit-signing/scripts",
        gnupg_home=GNUPG_HOME,
    )
    assert entry == {
        "name": "Pulp RPM Signing Service",
        "script": "/var/lib/pulpit-signing/scripts/sign_rpm_package.sh",
        "fingerprint": "A" * 40,
        "class": "rpm:RpmPackageSigningService",
        "home": GNUPG_HOME,
    }


def test_manifest_entry_uses_metadata_signing_class():
    entry = build_manifest_entry(
        purpose=PulpServicePurpose.METADATA,
        service_name="Pulp Metadata Signing Service (ABCD1234)",
        fingerprint="B" * 40,
        scripts_dir="/var/lib/pulpit-signing/scripts",
        gnupg_home=GNUPG_HOME,
    )
    assert entry["script"] == "/var/lib/pulpit-signing/scripts/sign_metadata.sh"
    assert entry["class"] == "core:AsciiArmoredDetachedSigningService"


def test_write_signing_services_manifest_is_atomic(tmp_path):
    manifest_path = tmp_path / "signing-services.json"
    entries = [
        build_manifest_entry(
            purpose=PulpServicePurpose.PACKAGE,
            service_name="svc",
            fingerprint="C" * 40,
            scripts_dir="/scripts",
            gnupg_home=GNUPG_HOME,
        )
    ]

    write_signing_services_manifest(entries, manifest_path=str(manifest_path))

    assert json.loads(manifest_path.read_text()) == entries
    # No leftover temp file after a successful write - the reconciler must
    # never see a `.tmp` file it doesn't know about.
    assert list(tmp_path.iterdir()) == [manifest_path]


def test_write_signing_services_manifest_overwrites_previous_content(tmp_path):
    manifest_path = tmp_path / "signing-services.json"
    write_signing_services_manifest(
        [build_manifest_entry(
            purpose=PulpServicePurpose.PACKAGE,
            service_name="old",
            fingerprint="D" * 40,
            scripts_dir="/scripts",
            gnupg_home=GNUPG_HOME,
        )],
        manifest_path=str(manifest_path),
    )

    # A full replace, not an append - a row that became ACTIVE since the last
    # write must disappear, not linger alongside the new pending set.
    write_signing_services_manifest([], manifest_path=str(manifest_path))

    assert json.loads(manifest_path.read_text()) == []
