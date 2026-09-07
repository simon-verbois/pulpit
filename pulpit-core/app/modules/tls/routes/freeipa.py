"""FreeIPA provider routes: settings CRUD, test-connection + request-cert
(both real network calls to an external server, so both are async jobs like
everywhere else in this module), and the setup wizard (applied
SYNCHRONOUSLY - see freeipa_wizard.py's own docstring for why)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import FullUser, require_staff_user
from app.core.crypto import SecretKeyNotConfigured
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job
from app.modules.tls import freeipa_settings
from app.modules.tls.freeipa_wizard import run_wizard_setup
from app.modules.tls.schemas import (
    FreeIpaWizardSetupRequest,
    FreeIpaWizardSetupResult,
    FreeIpaWizardStepResult,
    TlsFreeIpaSettingsRead,
    TlsFreeIpaSettingsUpdate,
)

router = APIRouter(prefix="/freeipa", dependencies=[Depends(require_staff_user)])


@router.get("/settings", response_model=TlsFreeIpaSettingsRead)
def read_settings(db: Session = Depends(get_db)) -> TlsFreeIpaSettingsRead:
    row = freeipa_settings.get_settings_row(db)
    db.commit()
    return TlsFreeIpaSettingsRead.model_validate(row)


@router.patch("/settings", response_model=TlsFreeIpaSettingsRead)
def patch_settings(
    changes: TlsFreeIpaSettingsUpdate, db: Session = Depends(get_db)
) -> TlsFreeIpaSettingsRead:
    row = freeipa_settings.get_settings_row(db)
    try:
        freeipa_settings.update_settings(db, row, changes.model_dump(exclude_unset=True))
    except SecretKeyNotConfigured as exc:
        # Only reachable when this request actually sets a non-empty
        # service_password - every other field updates fine with no key
        # configured at all (same as ldap/routes/settings.py).
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    db.commit()
    return TlsFreeIpaSettingsRead.model_validate(row)


@router.post("/test-connection", response_model=JobRead, status_code=202)
def test_connection(
    db: Session = Depends(get_db), user: FullUser = Depends(require_staff_user)
) -> JobRead:
    job = enqueue_job(db, "tls.freeipa_test_connection", {}, requested_by=user.username)
    db.commit()
    return JobRead.model_validate(job)


@router.post("/request-cert", response_model=JobRead, status_code=202)
def request_cert(
    db: Session = Depends(get_db), user: FullUser = Depends(require_staff_user)
) -> JobRead:
    job = enqueue_job(
        db, "tls.freeipa_request_cert", {"triggered_by": "manual"}, requested_by=user.username
    )
    db.commit()
    return JobRead.model_validate(job)


@router.post("/wizard/setup", response_model=FreeIpaWizardSetupResult)
def wizard_setup(
    request: FreeIpaWizardSetupRequest, db: Session = Depends(get_db)
) -> FreeIpaWizardSetupResult:
    """Runs SYNCHRONOUSLY, not through enqueue_job: `request.admin_password`
    must never reach the `jobs` table (a database table), even transiently.
    It exists only as a local variable for the duration of this call -
    never logged, never returned, discarded the moment this function
    returns."""
    success, steps, service_account_password = run_wizard_setup(
        base_url=request.base_url,
        verify_tls=request.verify_tls,
        admin_username=request.admin_username,
        admin_password=request.admin_password,
        common_name=request.common_name,
        target_principal=request.target_principal,
        service_account_username=request.service_account_username,
        ca=request.ca,
        profile=request.profile,
    )

    if service_account_password is not None:
        try:
            row = freeipa_settings.get_settings_row(db)
            freeipa_settings.update_settings(
                db,
                row,
                {
                    "enabled": True,
                    "base_url": request.base_url,
                    "verify_tls": request.verify_tls,
                    "common_name": request.common_name,
                    "service_principal": request.target_principal,
                    "service_username": request.service_account_username,
                    "service_password": service_account_password,
                    "ca": request.ca,
                    "profile": request.profile,
                    "renew_before_days": request.renew_before_days,
                },
            )
            db.commit()
        except SecretKeyNotConfigured as exc:
            steps.append(
                {
                    "step": "Save the automation account's credentials",
                    "status": "failed",
                    "detail": str(exc),
                }
            )
            success = False

    return FreeIpaWizardSetupResult(
        success=success, steps=[FreeIpaWizardStepResult(**s) for s in steps]
    )
