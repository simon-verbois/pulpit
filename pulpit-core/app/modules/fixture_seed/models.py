from app.core.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FixtureSeedState(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Marker row: its mere existence means the one-time sample-fixture
    seeding (jobs.py) has already been attempted on this instance - never
    re-run automatically after that, successful or not (see jobs.py's
    seed_sample_fixtures_job for why a partial failure still marks this).
    Deliberately its own table, not a boolean column bolted onto some other
    module's settings row (same "own table per module" precedent as
    DefaultSettings/SigningSettings, app/modules/default_settings/models.py).
    """

    __tablename__ = "fixture_seed_state"
