"""Dates et heures au format du contrat : ISODate « 2026-11-13 », ISODateTime « 2026-11-13T09:30:00.000Z »."""
from datetime import UTC, date, datetime, timedelta

from django.utils import timezone


def now() -> datetime:
    return timezone.now()


def today() -> date:
    """Date locale du centre (TIME_ZONE), comme localISODate() côté front."""
    return timezone.localdate()


def iso_dt(value: datetime | None) -> str | None:
    """Même format que Date.prototype.toISOString() (millisecondes, suffixe Z)."""
    if value is None:
        return None
    v = value.astimezone(UTC)
    return v.strftime("%Y-%m-%dT%H:%M:%S.") + f"{v.microsecond // 1000:03d}Z"


def iso_d(value: date | None) -> str | None:
    return value.isoformat() if value else None


def now_iso() -> str:
    return iso_dt(now())


def add_days(d: date, n: int) -> date:
    return d + timedelta(days=n)


def parse_date(value) -> date | None:
    """ISODate (ou début d'un ISODateTime) → date ; None si vide ou invalide."""
    if not value or not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def local_dt(d: date, hour: int = 10, minute: int = 0) -> datetime:
    """Heure locale du centre → datetime aware (équivalent de mocks/dates.ts › at())."""
    return timezone.make_aware(datetime(d.year, d.month, d.day, hour, minute))
