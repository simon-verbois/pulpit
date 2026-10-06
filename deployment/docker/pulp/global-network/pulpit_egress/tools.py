"""CLI entry points share the same policy; container health stays local."""
import os
import sys
from urllib.parse import urlsplit

from . import environment, read_policy


def _run(tool):
    arguments = sys.argv[1:]
    urls = [argument for argument in arguments if argument.startswith(("http://", "https://"))]
    local = urls and all(urlsplit(url).hostname in {"localhost", "127.0.0.1", "::1"} for url in urls)
    # Bootstrap health must work before pulpit-core publishes the policy.
    offline = "--version" in arguments or "--help" in arguments
    if tool == "git":
        offline = not any(argument in {"clone", "fetch", "pull", "push", "ls-remote", "submodule"} for argument in arguments)
    policy = None if local or offline else read_policy()
    env = environment(policy) if policy else dict(os.environ)
    if local:
        for name in ("http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "all_proxy"):
            env.pop(name, None)
        env["NO_PROXY"] = env["no_proxy"] = "*"
    if tool == "curl" and policy:
        arguments += ["--proxy", env["https_proxy"], "--cacert", policy["ca_bundle"]]
        if not policy.get("tls_validation", True):
            arguments += ["--insecure"]
    os.execve(f"/usr/bin/{tool}", [tool, *arguments], env)


def curl():
    _run("curl")


def git():
    _run("git")
