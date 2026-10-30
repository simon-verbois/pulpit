"""Enforce package signing in Pulp, including sync and on-demand artifacts.

Hooks verified against pulpcore 3.116.1 / pulp_rpm 3.38.5. Repository versions
are prepared before becoming complete, publications are checked before becoming
visible, and delivery checks run outside Pulp's Redis response cache.
"""

import asyncio
import atexit
from functools import lru_cache, wraps

from aiohttp import web
from asgiref.sync import sync_to_async
from django.conf import settings
from django.db import IntegrityError, close_old_connections, transaction
from pulpcore.plugin.models import Artifact, ContentArtifact, ProgressReport
from pulpcore.plugin.exceptions import PulpException
from pulp_rpm.app.models import Package, RpmDistribution, RpmPublication, RpmRepository
from pulp_rpm.app.shared_utils import read_crpackage_from_artifact, signing_key_matches
from pulp_rpm.app.tasks.signing import _sign_package
from pulp_rpm.app.models.content import RpmPackageSigningResult


class SigningPolicyError(PulpException):
    error_code = "PULPIT_RPM_SIGNING_POLICY"

    def __init__(self, message):
        super().__init__()
        self.message = message

    def __str__(self):
        return self.message


def fingerprint_for(repository):
    service = repository.package_signing_service_id
    fingerprint = repository.package_signing_fingerprint
    if bool(service) != bool(fingerprint):
        raise SigningPolicyError(
            "Package signing needs both a service and a fingerprint."
        )
    if not service:
        return None
    return fingerprint if ":" in fingerprint else f"v4:{fingerprint}"


def packages_in(version):
    return Package.objects.filter(pk__in=version.content.values("pk"))


@lru_cache(maxsize=256)
def verify_version(version_pk, fingerprint):
    # Completed version membership and package bytes are immutable. Cache
    # successes only, keyed by the requested signing key as well as version.
    from pulpcore.plugin.models import RepositoryVersion

    version = RepositoryVersion.objects.get(pk=version_pk)
    for keys in packages_in(version).values_list("signing_keys", flat=True).iterator():
        if not signing_key_matches(fingerprint, keys or []):
            raise SigningPolicyError(
                "Repository contains packages requiring signing. Run Re-sign first."
            )
    return True


def materialize(package):
    ca = ContentArtifact.objects.select_related("artifact").get(content=package)
    if ca.artifact_id:
        return ca.artifact
    sources = ca.remoteartifact_set.select_related("remote").all()
    last_error = None
    for source in sources:
        remote = source.remote.cast()

        async def download():
            factory = remote.download_factory
            try:
                downloader = remote.get_downloader(source)
                return await downloader.run(), downloader
            finally:
                # This factory belongs to this short-lived download loop,
                # unlike Pulp's long-lived sync pipeline factories.
                await factory._session.close()
                atexit.unregister(factory._session_cleanup)

        try:
            # Retain the downloader until Artifact.save() consumes its file;
            # its temporary file is removed when the downloader is collected.
            result, downloader = asyncio.run(download())
            artifact = Artifact.init_and_validate(
                str(result.path),
                expected_digests={package.checksum_type: package.pkgId},
                expected_size=package.size_package,
            )
            try:
                with transaction.atomic():
                    artifact.save()
            except IntegrityError:
                artifact = Artifact.objects.get(artifact.q())
            ca.artifact = artifact
            ca.save(update_fields=["artifact"])
            return artifact
        except Exception as exc:
            last_error = exc
    raise SigningPolicyError(
        f"Unable to download an RPM for signing ({type(last_error).__name__}); no unsigned version was published."
    ) from last_error


def sign_one(package, service, fingerprint):
    try:
        artifact = materialize(package)
        result = _sign_package(package, service, fingerprint)
        if result is None:
            # Synced metadata doesn't record signatures. Populate the field
            # from the actual RPM, after the native signer verified the key.
            _, keys = read_crpackage_from_artifact(artifact)
            if not signing_key_matches(fingerprint, keys or []):
                raise SigningPolicyError(
                    "RPM signature does not match the configured key."
                )
            package.signing_keys = keys
            package.save(update_fields=["signing_keys"])
        else:
            signed = Package.objects.get(pk=result[1])
            if not signing_key_matches(fingerprint, signed.signing_keys or []):
                raise SigningPolicyError(
                    "Signing service returned a package with the wrong key."
                )
        return result
    finally:
        close_old_connections()


def prepare_version(repository, version):
    fingerprint = fingerprint_for(repository)
    if not fingerprint:
        return
    pending = [
        p
        for p in packages_in(version)
        .only(
            "pk",
            "pulp_type",
            "signing_keys",
            "checksum_type",
            "pkgId",
            "size_package",
            "name",
            "version",
            "release",
            "arch",
            "is_modular",
            "pulp_labels",
        )
        .iterator()
        if not signing_key_matches(fingerprint, p.signing_keys or [])
    ]
    if not pending:
        return

    service = repository.package_signing_service

    # Native cache lookup precedes artifact materialization and RPM parsing.
    # Large retries must not read gigabytes of source RPMs already signed.
    checksums = [p.pkgId for p in pending if p.checksum_type == "sha256"]
    cached = dict(
        RpmPackageSigningResult.objects.filter(
            original_package_sha256__in=checksums,
            package_signing_fingerprint=fingerprint,
        ).values_list("original_package_sha256", "result_package_id")
    )
    trusted = {
        p.pk
        for p in Package.objects.filter(pk__in=cached.values()).only(
            "pk", "pulp_type", "signing_keys"
        )
        if signing_key_matches(fingerprint, p.signing_keys or [])
    }
    swaps = [
        (str(p.pk), str(cached[p.pkgId]))
        for p in pending
        if p.checksum_type == "sha256" and cached.get(p.pkgId) in trusted
    ]
    cached_sources = {old for old, _ in swaps}
    to_sign = [p for p in pending if str(p.pk) not in cached_sources]

    async def sign_all(progress):
        stopped = asyncio.Event()
        semaphore = asyncio.Semaphore(max(1, settings.MAX_PACKAGE_SIGNING_WORKERS))

        async def sign(package):
            async with semaphore:
                if stopped.is_set():
                    return None
                try:
                    result = await asyncio.to_thread(
                        sign_one, package, service, fingerprint
                    )
                    await progress.aincrement()
                    return result
                except Exception:
                    stopped.set()
                    raise

        # Wait for every in-flight signer on failure too. A failed version
        # must not disappear while a signer is still creating its content.
        return await asyncio.gather(*(sign(p) for p in to_sign), return_exceptions=True)

    with ProgressReport(
        message="Preparing signed RPM packages",
        code="pulpit.rpm.signing",
        total=len(pending),
    ) as progress:
        if swaps:
            progress.increase_by(len(swaps))
        results = asyncio.run(sign_all(progress))
        for result in results:
            if isinstance(result, SigningPolicyError):
                raise result
            if isinstance(result, BaseException):
                raise SigningPolicyError(
                    f"RPM signing failed ({type(result).__name__}): {str(result)[:500]}. The previous publication is preserved."
                ) from result
    swaps.extend(result for result in results if result)
    if swaps:
        version.remove_content(Package.objects.filter(pk__in=[old for old, _ in swaps]))
        version.add_content(Package.objects.filter(pk__in=[new for _, new in swaps]))


@lru_cache(maxsize=256)
def verify_publication_content(publication_pk, fingerprint, metadata_service):
    publication = RpmPublication.objects.get(pk=publication_pk)
    if fingerprint:
        verify_version(publication.repository_version_id, fingerprint)
        # Exact mirrors can carry PublishedArtifacts outside their version's
        # current package membership. Check the bytes actually being served.
        served = publication.published_artifact.values("content_artifact__content_id")
        for keys in (
            Package.objects.filter(pk__in=served)
            .values_list("signing_keys", flat=True)
            .iterator()
        ):
            if not signing_key_matches(fingerprint, keys or []):
                raise SigningPolicyError(
                    "Publication includes unsigned RPM artifacts. Regenerate its metadata after signing."
                )
    if metadata_service:
        if not publication.published_metadata.filter(
            relative_path="repodata/repomd.xml.asc"
        ).exists():
            raise SigningPolicyError(
                "Signed repository metadata is required before publication."
            )
    return True


def verify_publication(publication):
    repository = publication.repository.cast()
    fingerprint = fingerprint_for(repository)
    if fingerprint or repository.metadata_signing_service_id:
        verify_publication_content(
            publication.pk, fingerprint, repository.metadata_signing_service_id
        )


def check_delivery(handler, request):
    distro = handler._match_distribution(request.match_info["path"])
    if not isinstance(distro, RpmDistribution):
        return
    handler._permit(request, distro)
    if distro.checkpoint:
        rel_path = request.match_info["path"][len(distro.base_path) :].lstrip("/")
        publication = handler._select_checkpoint_publication(distro, rel_path)
    else:
        _, _, publication = distro.get_repository_publication_and_version()
    if publication:
        verify_publication(publication.cast())


def install():
    if getattr(RpmRepository, "_pulpit_signing_policy", False):
        return
    original_finalize = RpmRepository.finalize_new_version
    original_publication = RpmPublication.finalize_new_publication

    @wraps(original_finalize)
    def finalize(repository, version):
        original_finalize(repository, version)
        prepare_version(repository, version)
        # Revalidate paths/dependencies after swapping signed content units.
        original_finalize(repository, version)
        fingerprint = fingerprint_for(repository)
        if fingerprint:
            verify_version(version.pk, fingerprint)

    @wraps(original_publication)
    def finalize_publication(publication):
        original_publication(publication)
        verify_publication(publication)

    RpmRepository.finalize_new_version = finalize
    RpmPublication.finalize_new_publication = finalize_publication
    RpmRepository._pulpit_signing_policy = True


def install_content():
    # Pulp imports plugin content modules after django.setup(), before
    # registering routes. Importing pulpcore.content from AppConfig.ready
    # would recursively start Django's app registry.
    from pulpcore.content.handler import Handler

    if getattr(Handler, "_pulpit_signing_policy", False):
        return
    original_stream = Handler.stream_content

    @wraps(original_stream)
    async def stream(handler, request):
        try:
            await sync_to_async(check_delivery)(handler, request)
        except SigningPolicyError:
            raise web.HTTPServiceUnavailable(
                text="Repository content requires signing. Retry after Re-sign completes.",
                headers={"Retry-After": "30", "Cache-Control": "no-store"},
            ) from None
        return await original_stream(handler, request)

    Handler.stream_content = stream
    Handler._pulpit_signing_policy = True
