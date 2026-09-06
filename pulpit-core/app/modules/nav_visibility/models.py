from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class NavVisibleModule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A nav module GLOBALLY visible to every signed-in user, staff or not
    - UI-visibility convenience only, never an authorization boundary
    (docs/adr/0009-nav-visibility-settings.md): the real enforcement stays
    Pulp's own RBAC (a 403 from Pulp's API), this table only decides
    whether a whole nav section (e.g. "RPM") is offered at all. No
    staff/is_staff special-casing anywhere in this module any more (an
    earlier revision had a staff bypass; removed - see
    service.resolve_visible_modules's own docstring).

    Allow-list, and default-visible: EXPLICIT rows restrict everyone to
    exactly that set; no rows at all (nothing configured yet, or every
    module unchecked) means unrestricted - everyone sees everything. An
    administrator must explicitly grant a specific, non-empty subset in
    Administration's General tab to restrict anyone at all, and doing so
    restricts every user equally, including whichever staff account is
    doing the configuring. There is no separate "explicitly hidden" row -
    only granted facts.

    One single global set, not per-group/per-user (an earlier design here
    had exactly that - see this ADR's own revision history) - simpler to
    reason about: there is no concept of "some users should see less than
    other users" left in this module at all, staff or not.

    `module_id` is a free string, not a foreign key or enum - it must match
    one of `navTree.ts`'s own stable group ids on the frontend (the single
    source of truth for "what modules exist"); pulpit-core deliberately does
    not maintain its own duplicate enum of module ids to validate against.
    """

    __tablename__ = "nav_visible_modules"

    module_id: Mapped[str] = mapped_column(String(255), unique=True)
