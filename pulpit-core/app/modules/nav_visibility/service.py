from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.nav_visibility.models import NavVisibleModule


def get_visible_modules(db: Session) -> list[str]:
    rows = db.execute(select(NavVisibleModule.module_id)).scalars().all()
    return sorted(rows)


def set_visible_modules(db: Session, module_ids: list[str]) -> None:
    """Replace-all - see NavVisibilitySettingsUpdate's own docstring."""
    db.execute(delete(NavVisibleModule))
    db.flush()
    # dict.fromkeys de-dupes while preserving first-seen order - a caller
    # sending the same module_id twice shouldn't hit the unique constraint.
    for module_id in dict.fromkeys(module_ids):
        db.add(NavVisibleModule(module_id=module_id))
    db.flush()


def resolve_visible_modules(db: Session) -> list[str] | None:
    """The same answer for every signed-in user, staff or not - no
    is_staff bypass (this module's own earlier revision had one; removed
    after user feedback: "ça s'applique à tout le monde, donc à l'admin
    aussi" (it applies to everyone, including the admin) - a staff account
    unchecking a box in its own General tab must see that box's effect on
    its own sidebar too, immediately, to trust the setting is real).

    Default-visible: an empty allow-list (nothing configured yet, or every
    module unchecked) means unrestricted - `None` (see
    ResolvedNavVisibility's own docstring for why this is `None` and not
    "every module", which pulpit-core doesn't have a list of at all - see
    models.py's own docstring). An administrator must explicitly grant a
    specific, non-empty subset to actually restrict anyone - once they do,
    it restricts EVERY user, including staff/themselves. This is
    deliberately not "empty means show nothing" (an even earlier revision)
    - see docs/adr/0009-nav-visibility-settings.md's latest revision."""
    modules = get_visible_modules(db)
    return modules if modules else None
