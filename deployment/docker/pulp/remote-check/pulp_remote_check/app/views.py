import asyncio
import os

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from pulpcore.plugin.models import Remote

from pulp_remote_check.probe import (
    VIEW_PERMISSIONS,
    failure_detail,
    looks_like_repomd,
    probe_url,
)

# ULN login alone retries up to 4 times (pulp_rpm UlnDownloader), so leave
# room for that plus the metadata download itself.
PROBE_TIMEOUT_SECONDS = 60


def _can_view(user, remote, perm):
    return (
        user.has_perm(perm)
        or user.has_perm(perm, remote.pulp_domain)
        or user.has_perm(perm, remote)
    )


async def _probe(remote, url):
    downloader = remote.get_downloader(url=url)
    result = await asyncio.wait_for(downloader.run(), PROBE_TIMEOUT_SECONDS)
    try:
        with open(result.path, "rb") as handle:
            head = handle.read(4096)
    finally:
        os.unlink(result.path)
    return head


class RemoteTestView(APIView):
    """POST /pulp/api/v3/pulpit/remotes/<pk>/test/

    Runs a real, read-only request with the remote's *saved* configuration
    (including write-only secrets such as the ULN password, which the API
    never returns) and reports whether it works. Nothing is synced or stored.
    """

    def post(self, request, pk, pulp_domain=None):
        remote = get_object_or_404(Remote, pk=pk).cast()
        perm = VIEW_PERMISSIONS.get(remote.TYPE)
        if perm is None or remote.pulp_type.split(".")[0] != "rpm":
            raise NotFound("Connection tests are only supported for RPM and ULN remotes.")
        if not _can_view(request.user, remote, perm):
            raise NotFound()

        url = probe_url(remote.url)
        try:
            head = asyncio.run(_probe(remote, url))
        except asyncio.TimeoutError:
            return Response(
                {
                    "ok": False,
                    "detail": f"No answer within {PROBE_TIMEOUT_SECONDS} seconds.",
                    "url": url,
                }
            )
        except Exception as exc:  # any network/auth/TLS failure is a test result
            return Response({"ok": False, "detail": failure_detail(exc), "url": url})

        if not looks_like_repomd(head):
            return Response(
                {
                    "ok": False,
                    "detail": "The server answered, but not with RPM repository metadata.",
                    "url": url,
                }
            )
        return Response({"ok": True, "detail": "Repository metadata retrieved.", "url": url})
