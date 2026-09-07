"""Staff-only: enqueues a direct LDAP bind+search check against whatever is
currently in the settings form (not necessarily saved yet) - see
jobs.test_connection_job's own docstring. Never touches Pulp or the
manifest at all, unlike apply.py."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import FullUser, require_staff_user
from app.core.database import get_db
from app.core.jobs.schemas import JobRead
from app.core.jobs.service import enqueue_job
from app.modules.ldap.jobs import TEST_CONNECTION_JOB_TYPE
from app.modules.ldap.schemas import LdapTestConnectionRequest

router = APIRouter(dependencies=[Depends(require_staff_user)])


@router.post("/settings/test-connection", response_model=JobRead, status_code=202)
def test_connection(
    request: LdapTestConnectionRequest,
    db: Session = Depends(get_db),
    user: FullUser = Depends(require_staff_user),
) -> JobRead:
    job = enqueue_job(
        db,
        TEST_CONNECTION_JOB_TYPE,
        request.model_dump(exclude_unset=True),
        requested_by=user.username,
    )
    db.commit()
    return JobRead.model_validate(job)
