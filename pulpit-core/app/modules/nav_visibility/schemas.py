"""Pydantic request/response models for the nav-visibility API.

No `NavModuleId` enum here - see models.py's own docstring on why
`module_id` stays a free string validated only by the frontend's own
`navTree.ts`, not duplicated as a second list here.
"""

from pydantic import BaseModel


class NavVisibilitySettingsRead(BaseModel):
    # Presence = explicitly granted (and, once any row exists, everything
    # NOT listed here is restricted for every user) - see NavVisibleModule's
    # own docstring on the default-visible/no-staff-bypass semantics.
    visible_module_ids: list[str]


class NavVisibilitySettingsUpdate(BaseModel):
    """PUT semantics - replaces the entire granted-module set with this
    list (never an incremental add/remove), same as RoleAssignment-style
    replace-all calls elsewhere in this app's own frontend conventions."""

    visible_module_ids: list[str]


class ResolvedNavVisibility(BaseModel):
    """The final answer for the calling user - the same for every signed-in
    user regardless of role, no staff bypass (see
    service.resolve_visible_modules's own docstring).

    `visible_module_ids: null` means unrestricted (nothing has been
    explicitly granted yet - the default-visible state, see
    service.resolve_visible_modules) - deliberately not "every known module
    id", since pulpit-core has no list of those at all (see models.py's own
    docstring: `module_id` is validated only against `navTree.ts` on the
    frontend). A non-empty array is the real restricted case: exactly those
    modules are visible, for every user.
    """

    visible_module_ids: list[str] | None
