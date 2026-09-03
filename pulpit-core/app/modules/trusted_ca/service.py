import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.trusted_ca.models import TrustedCaCertificate, TrustedCaStatus


def list_certificates(db: Session) -> list[TrustedCaCertificate]:
    return list(
        db.execute(select(TrustedCaCertificate).order_by(TrustedCaCertificate.created_at))
        .scalars()
        .all()
    )


def get_certificate(db: Session, certificate_id: uuid.UUID) -> TrustedCaCertificate | None:
    return db.get(TrustedCaCertificate, certificate_id)


def get_certificate_by_name(db: Session, name: str) -> TrustedCaCertificate | None:
    return db.execute(
        select(TrustedCaCertificate).where(TrustedCaCertificate.name == name)
    ).scalar_one_or_none()


def create_certificate(db: Session, *, name: str, pem: str) -> TrustedCaCertificate:
    row = TrustedCaCertificate(name=name, pem=pem, status=TrustedCaStatus.PENDING)
    db.add(row)
    db.flush()
    return row


def delete_certificate(db: Session, row: TrustedCaCertificate) -> None:
    db.delete(row)
    db.flush()
