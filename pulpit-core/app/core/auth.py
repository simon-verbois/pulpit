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


@dataclass
class FullUser:
    """The caller's full Pulp user record - `is_staff`, which `/login/`'s
    narrow response (CurrentUser above) doesn't carry. Fetched by
    `get_full_user` via the same self-lookup a user is always allowed to
    perform on their own account (GET {pulp_href}, forwarding the caller's
    own credentials - VERIFIED live: needs no elevated privilege), so this
    costs one extra Pulp round trip and is only depended on by routes that
    actually need it (any `require_staff_user`-gated route, e.g.
    nav-visibility's admin settings route - its own `/me` resolution does
    NOT need this, and uses the cheaper `require_authenticated_user`
    instead, since resolution has no staff special-casing at all), not by
    every authenticated route."""

    username: str
    pulp_href: str
    is_staff: bool


def _forward_headers(request: Request) -> dict[str, str]:
    forward_headers = {}
    if cookie := request.headers.get("cookie"):
        forward_headers["cookie"] = cookie
    if auth := request.headers.get("authorization"):
        forward_headers["authorization"] = auth
    return forward_headers


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
    forward_headers = _forward_headers(request)

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


async def get_full_user(
    request: Request,
    current_user: CurrentUser = Depends(require_authenticated_user),
    settings: Settings = Depends(get_settings),
) -> FullUser:
    url = f"{settings.pulp_base_url}{current_user.pulp_href}"
    async with httpx.AsyncClient(timeout=settings.pulp_request_timeout_seconds) as client:
        try:
            response = await client.get(url, headers=_forward_headers(request))
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="Pulp is currently unavailable") from exc

    if response.status_code != 200:
        # The session was valid a moment ago (require_authenticated_user just
        # confirmed it) but reading the full record failed regardless - treat
        # it the same as a lost session rather than a permission error, since
        # a user can always read their own record.
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = response.json()
    return FullUser(
        username=current_user.username,
        pulp_href=current_user.pulp_href,
        is_staff=bool(body.get("is_staff", False)),
    )


async def require_staff_user(user: FullUser = Depends(get_full_user)) -> FullUser:
    """The first admin-only gate in pulpit-core (no route previously checked
    `is_staff` - see docs/adr/0009-nav-visibility-settings.md). `is_staff` is
    the only administrator-ish flag Pulp's API actually exposes:
    `is_superuser` is filterable on the Users list endpoint but is not a
    field on `UserResponse` at all (VERIFIED live), so it can't be checked
    this way."""
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Staff access required")
    return user
