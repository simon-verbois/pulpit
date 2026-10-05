"""Run inside the derived Pulp image: python3 /tmp/test_timeouts.py."""

import asyncio
import unittest
from uuid import UUID

import django

django.setup()

from aiohttp import web
from pulpcore.app.models import Remote
from pulpcore.download.factory import DownloaderFactory


class DownloadTimeoutTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        async def stream(request):
            response = web.StreamResponse()
            await response.prepare(request)
            try:
                for _ in range(10):
                    await response.write(b"data")
                    await asyncio.sleep(0.1)
                await response.write_eof()
            except ConnectionResetError:
                pass
            return response

        async def stall(request):
            response = web.StreamResponse()
            await response.prepare(request)
            await response.write(b"data")
            await asyncio.sleep(0.6)
            return response

        app = web.Application()
        app.router.add_get("/stream", stream)
        app.router.add_get("/stall", stall)
        self.runner = web.AppRunner(app)
        await self.runner.setup()
        site = web.TCPSite(self.runner, "127.0.0.1", 0)
        await site.start()
        port = site._server.sockets[0].getsockname()[1]
        self.url = f"http://127.0.0.1:{port}"

    async def asyncTearDown(self):
        await self.runner.cleanup()

    def session(self, **timeouts):
        factory = DownloaderFactory.__new__(DownloaderFactory)
        factory._remote = Remote(
            name="timeout-test", url=self.url, pulp_domain_id=UUID(int=0), **timeouts
        )
        return factory._make_aiohttp_session_from_remote()

    async def test_stream_outlasts_explicit_total_timeout(self):
        async with self.session(total_timeout=0.2, sock_read_timeout=0.3) as session:
            async with session.get(self.url + "/stream") as response:
                self.assertEqual(await response.read(), b"data" * 10)

    async def test_stalled_connection_still_times_out(self):
        async with self.session(total_timeout=1800, sock_read_timeout=0.2) as session:
            with self.assertRaises(asyncio.TimeoutError):
                async with session.get(self.url + "/stall") as response:
                    await response.read()

    async def test_default_inactivity_limit_and_connection_limits(self):
        for total in (None, 0, 1800):
            async with self.session(total_timeout=total, connect_timeout=60) as session:
                self.assertIsNone(session.timeout.total)
                self.assertEqual(session.timeout.sock_read, 300)
                self.assertEqual(session.timeout.connect, 60)


if __name__ == "__main__":
    unittest.main()
