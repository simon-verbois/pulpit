"""GUI settings publish one private runtime policy, including rotation/removal."""
from pathlib import Path

from pulpit_egress import read_policy

from app.modules.default_settings import service


def test_settings_publish_to_runtime_without_exporting_password(db):
    row = service.get_settings_row(db)
    service.update_settings(db, row, {
        "proxy_url": "http://proxy.example.com:3128",
        "proxy_username": "proxyuser",
        "proxy_password": "test-only-password",
    })
    service.publish_global_policy(row)
    policy = read_policy()
    assert policy["proxy_url"] == row.proxy_url
    assert policy["proxy_password"] == "test-only-password"
    assert "pulp" in policy["bypass_hosts"]
    assert Path(policy["ca_bundle"]).is_file()
    assert row.proxy_password_encrypted != policy["proxy_password"]


def test_clearing_global_proxy_replaces_previous_policy(db):
    row = service.get_settings_row(db)
    service.update_settings(db, row, {"proxy_url": "http://old.example:3128"})
    service.publish_global_policy(row)
    service.update_settings(db, row, {"proxy_url": "", "proxy_ca_cert": ""})
    service.publish_global_policy(row)
    assert read_policy()["proxy_url"] == ""
    assert read_policy()["ca_cert"] is None
