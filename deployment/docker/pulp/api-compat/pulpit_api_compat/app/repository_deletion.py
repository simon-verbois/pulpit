"""Delete repository-owned URLs inside Pulp's native deletion transaction."""


def install_repository_deletion_policy() -> None:
    """Remove direct and pinned distributions before their targets are lost.

    This is Pulpit's explicit deletion policy, not upstream Pulp behavior.
    Installing on the native model covers synchronous and asynchronous tasks
    and survives a browser closing after the DELETE request is accepted.
    """
    from functools import wraps

    from django.db import router, transaction
    from django.db.models import Q
    from pulpcore.app.models import Distribution, Repository

    if getattr(Repository, "_pulpit_distribution_cascade", False):
        return
    original_delete = Repository.delete

    @wraps(original_delete)
    def delete(self, **kwargs):
        if self.pk is None:
            return original_delete(self, **kwargs)
        using = kwargs.get("using") or router.db_for_write(type(self), instance=self)
        with transaction.atomic(using=using):
            # Serialize new direct associations against removal of their owner.
            Repository.objects.using(using).select_for_update().get(pk=self.pk)
            distributions = (
                Distribution.objects.using(using)
                .filter(pulp_domain_id=self.pulp_domain_id)
                .filter(
                    Q(repository_id=self.pk)
                    | Q(repository_version__repository_id=self.pk)
                    | Q(publication__repository_version__repository_id=self.pk)
                )
            )
            for distribution in distributions.iterator(chunk_size=100):
                # Instance deletion runs native cache invalidation and each
                # plugin's lifecycle hooks; QuerySet.delete bypasses those.
                distribution.cast().delete(using=using)
            return original_delete(self, **kwargs)

    Repository.delete = delete
    Repository._pulpit_distribution_cascade = True
