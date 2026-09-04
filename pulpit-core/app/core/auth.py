"""pulpit-core has no user/session store of its own - Pulp remains the only
identity source (docs/AUTHENTICATION.md, ADR 0001, carried forward by ADR
0006). A request reaching pulpit-core (always through the same nginx origin
- see deployment/docker/nginx/pulpit.conf.template) forwards whatever cookie/Basic-auth
header the browser already sent Pulp; pulpit-core validates it the same way
Pulpit's own frontend does: GET /pulp/api/v3/login/ ("who am I" - VERIFIED
in docs/AUTHENTICATION.md), reusing Pulp's answer rather than inventing a
second one.

Unlike Pulp/Django, FastAPI has no built-in CSRF protection, and pulpit-core
relies on the browser's ambient session cookie the same way Pulp does - so
without an explicit check, a malicious cross-site page could ride a logged-in
admin's session into a mutating pulpit-core request (classic CSRF), even
though it could never read the cookie itself. Reuse the same defense Django
already provides for Pulp: the non-httpOnly `csrftoken` cookie
(docs/AUTHENTICATION.md) is readable by Pulpit's own JS but not by another
origin's, so requiring the `X-CSRFToken` header to match it (the standard
"double-submit cookie" pattern) is a real, effective check here without
inventing a second token scheme.
"""

from dataclasses import dataclass

import httpx
from fastapi import Depends, HTTPException, Request

from app.core.config import Settings, get_settings

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


@dataclass
class CurrentUser:
    username: str
    pulp_href: str


def _check_csrf(request: Request) -> None:
    if request.method in _SAFE_METHODS:
        return
    cookie_token = request.cookies.get("csrftoken")
    header_token = request.headers.get("x-csrftoken")
    if not cookie_token or not header_token or cookie_token != header_token:
        raise HTTPException(status_code=403, detail="CSRF token missing or incorrect")


async def require_authenticated_user(
    request: Request, settings: Settings = Depends(get_settings)
) -> CurrentUser:
    forward_headers = {}
    if cookie := request.headers.get("cookie"):
        forward_headers["cookie"] = cookie
    if auth := request.headers.get("authorization"):
        forward_headers["authorization"] = auth

    if not forward_headers:
        raise HTTPException(status_code=401, detail="Not authenticated")

    url = f"{settings.pulp_base_url}{settings.pulp_api_base_path}/login/"
    async with httpx.AsyncClient(timeout=settings.pulp_request_timeout_seconds) as client:
        try:
            response = await client.get(url, headers=forward_headers)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="Pulp is currently unavailable") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Only enforced once we know a real session cookie is in play - a bare
    # Basic-auth request (no cookie at all) has nothing for Django's own CSRF
    # check to key off of either, matching Pulp's own behavior
    # (docs/AUTHENTICATION.md: "Basic-auth-only requests ... aren't checked").
    if "cookie" in forward_headers:
        _check_csrf(request)

    body = response.json()
    return CurrentUser(username=body.get("username", ""), pulp_href=body.get("pulp_href", ""))
