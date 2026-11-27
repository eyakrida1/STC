"""
Dates relatives au jour de l'initialisation de la démo (port de frontend/src/mocks/dates.ts),
pour que les données restent « fraîches ». Mêmes débordements de mois / jours que `new Date(y, m, d)` en JS.
"""
from datetime import date, timedelta

from .. import timeutil


def _today() -> date:
    return timeutil.today()


def _ymd(year: int, month0: int, day: int) -> date:
    """Équivalent de new Date(year, month0, day) : mois et jours hors bornes reportés."""
    y, m = divmod(year * 12 + month0, 12)
    return date(y, m + 1, 1) + timedelta(days=day - 1)


def days_ago(n: int) -> str:
    return (_today() - timedelta(days=n)).isoformat()


def days_ahead(n: int) -> str:
    return days_ago(-n)


def months_ago(n: int, day: int = 5) -> str:
    t = _today()
    return _ymd(t.year, t.month - 1 - n, day).isoformat()


def years_ago(years: int, month_offset: int = 0, day: int = 14) -> str:
    t = _today()
    return _ymd(t.year - years, t.month - 1 - month_offset, day).isoformat()


def at(d: str, hour: int = 10, minute: int = 0) -> str:
    """Heure locale du centre → ISODateTime UTC (« …Z »)."""
    return timeutil.iso_dt(timeutil.local_dt(date.fromisoformat(d), hour, minute))
