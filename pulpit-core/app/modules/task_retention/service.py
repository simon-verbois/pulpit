from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.task_retention.models import TaskRetentionSettings


def get_settings_row(db: Session) -> TaskRetentionSettings:
    """Singleton row, created with the defaults (enabled, 90 days) on first access."""
    row = (
        db.execute(select(TaskRetentionSettings).order_by(TaskRetentionSettings.created_at))
        .scalars()
        .first()
    )
    if row is None:
        row = TaskRetentionSettings(enabled=True, retention_days=90)
        db.add(row)
        db.flush()
    return row


def update_settings(
    db: Session, row: TaskRetentionSettings, changes: dict
) -> TaskRetentionSettings:
    if changes.get("enabled") is not None:
        row.enabled = changes["enabled"]
    if changes.get("retention_days") is not None:
        row.retention_days = changes["retention_days"]
    db.flush()
    return row
