import httpx
import pytest
import respx

from app.core.auth import close_auth_client, get_auth_client


@pytest.mark.anyio
async def test_client_is_reused_within_a_loop():
    assert get_auth_client() is get_auth_client()
    await close_auth_client()


@pytest.mark.anyio
@respx.mock
async def test_set_cookie_from_pulp_is_never_replayed():
    # The shared client must not become a session store: a Set-Cookie answered
    # to one caller can't be sent along on another caller's request.
    route = respx.get("http://pulp-test/login/").mock(
        return_value=httpx.Response(200, headers={"set-cookie": "sessionid=alice; Path=/"})
    )
    client = get_auth_client()
    await client.get("http://pulp-test/login/")
    await client.get("http://pulp-test/login/")
    assert "cookie" not in route.calls.last.request.headers
    await close_auth_client()
