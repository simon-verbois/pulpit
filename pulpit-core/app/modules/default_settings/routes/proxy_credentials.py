from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import require_staff_user
from app.core.crypto import decrypt_secret
from app.core.database import get_db
from app.modules.default_settings import service
from app.modules.default_settings.schemas import ProxyCredentials

# Staff-only: this is the one endpoint in the module that returns the real,
# decrypted proxy password (see docstring below) rather than just
# proxy_password_is_set - readable by every authenticated user would let any
# logged-in account harvest the instance-wide proxy credentials used to
# reach every plugin's every Remote, matching the staff-only bar
# apply_proxy.py already sets for the same "instance-wide proxy" blast
# radius.
router = APIRouter(prefix="/proxy-credentials", dependencies=[Depends(require_staff_user)])


@router.get("", response_model=ProxyCredentials)
def read_proxy_credentials(db: Session = Depends(get_db)) -> ProxyCredentials:
    """The real, decrypted proxy password - unlike GET /settings, which
    only ever reports proxy_password_is_set. Called only at the moment the
    frontend actually applies the default proxy to a new/edited Remote
    (RemoteConnectionSettingsFields.tsx's "use instance default" mode), not
    by the Default Settings page itself."""
    row = service.get_settings_row(db)
    db.commit()
    return ProxyCredentials(
        proxy_url=row.proxy_url,
        proxy_username=row.proxy_username,
        proxy_password=(
            decrypt_secret(row.proxy_password_encrypted)
            if row.proxy_password_encrypted is not None
            else None
        ),
        proxy_ca_cert=row.proxy_ca_cert,
    )
