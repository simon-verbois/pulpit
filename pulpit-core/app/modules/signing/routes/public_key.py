"""Public, unauthenticated key distribution (task section 7). Mounted at the
bare `/keys/...` path (see app/modules/registry.py build_public_router and
app/main.py) - `deployment/docker/nginx/pulpit.conf.template` proxies it straight
through with no auth check, exactly like DNF expects for a `gpgkey=` URL.

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

from app.core.database import get_db
from app.modules.signing import service
from app.modules.signing.schemas import SigningKeyPublic
from app.modules.signing.models import SigningKey

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
def get_public_key_by_fingerprint(fingerprint: str, db: Session = Depends(get_db)) -> SigningKeyPublic:
    """Not the stable client-facing URL (that's `/{filename}` above, always
    the current active key only) - a diagnostic/audit lookup for any key,
    including retired ones, by its exact fingerprint."""
    key = db.query(SigningKey).filter(SigningKey.fingerprint == fingerprint).first()
    db.commit()
    if key is None:
        raise HTTPException(status_code=404, detail="Unknown fingerprint")
    return SigningKeyPublic(fingerprint=key.fingerprint, public_key_armor=key.public_key_armor)
