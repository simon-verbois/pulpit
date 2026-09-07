"""Public, unauthenticated key distribution (task section 7): `GET
/{filename}` below. Mounted at the bare `/keys/...` path (see
app/modules/registry.py build_public_router and app/main.py) -
`deployment/docker/nginx/pulpit.conf.template` proxies it straight through
with no auth check, exactly like DNF expects for a `gpgkey=` URL.

`GET /by-fingerprint/{fingerprint}` shares this router/prefix (so the
diagnostic lookup lives next to the URL it's a diagnostic companion for) but
is its own, staff-gated exception to "public, unauthenticated" - see its own
docstring below.

Single active key model (task requirement: "je veux une seule cle active
... on expose toujours la meme"): this URL always serves exactly the
CURRENT active key, never a coexistence bundle - see
app/modules/signing/jobs.py's publish_key_job, which unconditionally
resigns existing packages and republishes metadata under the new key as
part of publishing, precisely so there is never a transition window where
clients need to trust two keys at once for this repository content.

Trust model note (task section 7, and documented at length in
docs/signing.md "Trust bootstrapping is not automatic"): publishing the key
here does not make a DNF client trust it automatically - the first time a
client imports it, `dnf`/`rpm` still prompts for (or requires
`--nogpgcheck`/`--assumeyes`, or an out-of-band-verified fingerprint) manual
approval. This applies with extra force under the single-key model: since
the content behind this URL is *replaced* (not appended to) on every
publish, a client that hasn't refreshed its trust store since the last
publish will fail verification until it re-imports the new key.
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.auth import FullUser, require_staff_user
from app.core.database import get_db
from app.modules.signing import service
from app.modules.signing.models import SigningKey
from app.modules.signing.schemas import SigningKeyPublic

router = APIRouter(prefix="/keys")


@router.get("/{filename}")
def get_public_key(filename: str, db: Session = Depends(get_db)) -> Response:
    """Serves only the current ACTIVE key's public key - see module
    docstring for why there is no old+new coexistence here."""
    settings_row = service.get_settings_row(db)
    if filename != settings_row.public_key_filename:
        raise HTTPException(status_code=404, detail="Unknown key filename")

    active_key = service.get_active_key(db)
    db.commit()
    if active_key is None:
        raise HTTPException(status_code=404, detail="No active signing key has been published yet")

    return Response(
        content=active_key.public_key_armor.strip() + "\n", media_type="application/pgp-keys"
    )


@router.get("/by-fingerprint/{fingerprint}", response_model=SigningKeyPublic)
def get_public_key_by_fingerprint(
    fingerprint: str,
    db: Session = Depends(get_db),
    _user: FullUser = Depends(require_staff_user),
) -> SigningKeyPublic:
    """Not the stable client-facing URL (that's `/{filename}` above, always
    the current active key only) - a diagnostic/audit lookup for any key,
    including retired ones, by its exact fingerprint.

    Unlike `/{filename}` above, this is deliberately NOT part of the public,
    unauthenticated surface docs/signing.md documents ("Public key
    distribution") - it can return a RETIRED/RETIRING key's public material
    too, which DNF/rpm clients never need and no doc promises. It only
    happens to live on this module's public_key.router (mounted
    unauthenticated at bare `/keys/...` - module.py) alongside the genuinely
    public route, so the staff gate is applied directly on this one route
    rather than moved to another router - same require_staff_user dependency
    repositories.py's own staff-only `/apply-to-all` route uses, since this
    is diagnostic/audit-oriented per its own docstring above, not something
    every authenticated user needs."""
    key = db.query(SigningKey).filter(SigningKey.fingerprint == fingerprint).first()
    db.commit()
    if key is None:
        raise HTTPException(status_code=404, detail="Unknown fingerprint")
    return SigningKeyPublic(fingerprint=key.fingerprint, public_key_armor=key.public_key_armor)
