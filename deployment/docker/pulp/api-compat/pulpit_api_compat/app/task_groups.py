"""Finish native RPM dispatch so group completion reflects server-owned facts."""

from functools import wraps
from urllib.parse import urlsplit


def finish_dispatch(group) -> None:
    if group is None:
        return
    group.refresh_from_db(fields=["all_tasks_dispatched"])
    if not group.all_tasks_dispatched:
        group.finish()


def wrap_prune_dispatch(original):
    @wraps(original)
    def prune_packages(*args, **kwargs):
        from pulpcore.plugin.models import TaskGroup

        group = TaskGroup.current()
        try:
            return original(*args, **kwargs)
        finally:
            # A failed dispatcher cannot enqueue further children either.
            # Children already dispatched retain their own real outcomes.
            finish_dispatch(group)

    return prune_packages


def wrap_acs_refresh(original):
    @wraps(original)
    def refresh(*args, **kwargs):
        from pulpcore.plugin.models import TaskGroup

        response = original(*args, **kwargs)
        href = response.data.get("task_group")
        if href:
            pk = urlsplit(href).path.rstrip("/").rsplit("/", 1)[-1]
            finish_dispatch(TaskGroup.objects.get(pk=pk))
        return response

    return refresh


def install_task_group_compat() -> None:
    from pulp_rpm.app import tasks
    from pulp_rpm.app.tasks import prune
    from pulp_rpm.app.viewsets import RpmAlternateContentSourceViewSet

    if not getattr(prune.prune_packages, "_pulpit_dispatch_compat", False):
        original = prune.prune_packages
        wrapped = wrap_prune_dispatch(original)
        wrapped._pulpit_dispatch_compat = True
        prune.prune_packages = wrapped
        if getattr(tasks, "prune_packages", None) is original:
            tasks.prune_packages = wrapped

    view = RpmAlternateContentSourceViewSet
    if not getattr(view.refresh, "_pulpit_dispatch_compat", False):
        wrapped = wrap_acs_refresh(view.refresh)
        wrapped._pulpit_dispatch_compat = True
        view.refresh = wrapped
