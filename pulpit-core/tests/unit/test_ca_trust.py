import base64

from app.adapters.pulp.ca_trust import ANCHOR_DIR, anchor_filename, build_sync_script


class TestAnchorFilename:
    def test_prefixes_and_keeps_a_safe_name(self):
        assert anchor_filename("corp-proxy") == "pulpit-corp-proxy.crt"

    def test_sanitizes_unsafe_characters(self):
        assert anchor_filename("corp proxy/v2") == "pulpit-corp_proxy_v2.crt"


class TestBuildSyncScript:
    def test_empty_set_still_clears_and_updates_trust(self):
        script = build_sync_script([])
        assert f"rm -f {ANCHOR_DIR}/pulpit-*.crt" in script
        assert script.strip().endswith("update-ca-trust")

    def test_removes_stale_files_before_writing_current_ones(self):
        script = build_sync_script([("corp", "-----BEGIN CERTIFICATE-----\nAA\n-----END CERTIFICATE-----\n")])
        lines = script.splitlines()
        rm_index = next(i for i, line in enumerate(lines) if line.startswith("rm -f"))
        write_index = next(i for i, line in enumerate(lines) if "pulpit-corp.crt" in line)
        assert rm_index < write_index

    def test_embeds_the_pem_as_base64_not_raw(self):
        pem = "-----BEGIN CERTIFICATE-----\nMIIC...==\n-----END CERTIFICATE-----\n"
        script = build_sync_script([("corp", pem)])
        assert pem not in script
        assert base64.b64encode(pem.encode()).decode() in script

    def test_writes_one_file_per_certificate(self):
        script = build_sync_script(
            [("corp-a", "cert-a"), ("corp-b", "cert-b")],
        )
        assert f"{ANCHOR_DIR}/pulpit-corp-a.crt" in script
        assert f"{ANCHOR_DIR}/pulpit-corp-b.crt" in script

    def test_fails_fast_on_error(self):
        assert build_sync_script([]).startswith("set -e")
