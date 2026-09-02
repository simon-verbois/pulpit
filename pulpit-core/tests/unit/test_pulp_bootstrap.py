from app.modules.signing.models import PulpServicePurpose
from app.modules.signing.pulp_bootstrap import build_bootstrap_command

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
