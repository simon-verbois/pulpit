"""Scope a saved remote's TLS exception to its downloads and child processes."""

import os
from contextlib import contextmanager
from contextvars import ContextVar
from functools import wraps
from importlib.util import find_spec

_SKIP_ENV = "PULPIT_REMOTE_TLS_SKIP"
_skip_validation = ContextVar("pulpit_remote_tls_skip", default=False)


def skipping_validation(inherited=None):
    env = os.environ if inherited is None else inherited
    return _skip_validation.get() or env.get(_SKIP_ENV) == "1"


def effective_policy(policy, inherited=None):
    return (
        dict(policy, tls_validation=False) if skipping_validation(inherited) else policy
    )


def child_environment(env, inherited=None):
    if skipping_validation(inherited):
        env[_SKIP_ENV] = "1"
    else:
        env.pop(_SKIP_ENV, None)
    return env


@contextmanager
def remote_tls(remote):
    token = _skip_validation.set(getattr(remote, "tls_validation", True) is False)
    try:
        yield
    finally:
        _skip_validation.reset(token)


def install_remote_tls():
    """Bind native remote settings to download execution, including ULN login."""
    from pulpcore.download.factory import DownloaderFactory

    if getattr(DownloaderFactory, "_pulpit_remote_tls", False):
        return
    original_build = DownloaderFactory.build

    def scope_run(download_class):
        original_run = download_class.run
        if getattr(original_run, "_pulpit_remote_tls", False):
            return

        @wraps(original_run)
        async def run(downloader, *args, **kwargs):
            token = _skip_validation.set(getattr(downloader, "_pulpit_skip_tls", False))
            try:
                return await original_run(downloader, *args, **kwargs)
            finally:
                _skip_validation.reset(token)

        run._pulpit_remote_tls = True
        download_class.run = run

    @wraps(original_build)
    def build(factory, *args, **kwargs):
        downloader = original_build(factory, *args, **kwargs)
        downloader._pulpit_skip_tls = factory._remote.tls_validation is False
        # HTTP classes override BaseDownloader.run. Scope the concrete method
        # without creating an instance -> bound callback -> instance cycle;
        # temporary download files retain their native cleanup lifetime.
        scope_run(type(downloader))
        return downloader

    DownloaderFactory.build = build
    DownloaderFactory._pulpit_remote_tls = True

    if find_spec("pulp_ansible"):
        from pulp_ansible.app.tasks import collections

        original_git = collections.declarative_content_from_git_repo

        @wraps(original_git)
        async def git_collection(remote, *args, **kwargs):
            with remote_tls(remote):
                return await original_git(remote, *args, **kwargs)

        collections.declarative_content_from_git_repo = git_collection

    if find_spec("pulp_file"):
        from pulp_file.app.tasks import synchronizing

        original_clone_env = synchronizing._build_clone_env

        @wraps(original_clone_env)
        def clone_env(remote):
            with remote_tls(remote):
                return child_environment(original_clone_env(remote))

        synchronizing._build_clone_env = clone_env
