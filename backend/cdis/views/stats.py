"""
Tableau de bord du directeur : AGRÉGATS uniquement (api/stats.ts). Jamais le contenu des séances ni des notes,
jamais l'humeur d'un enfant en particulier (seulement la moyenne du centre).
"""
import math
from datetime import date

from .. import timeutil
from ..access import PRO_ROLES, ROADMAP_OWNERS
from ..http import ApiError, endpoint
from ..models import AidApplication, AttendanceEntry, AuditEntry, Child, ClosedStay, Roadmap, Session, User

PERIOD_DAYS = {"mois": 30, "trimestre": 91, "annee": 365}
DESTINATIONS = ["ecole", "formation", "emploi", "famille", "autre_structure", "abandon"]
INSERTION = {"ecole", "formation", "emploi"}


def js_round(x: float) -> int:
    """Math.round de JavaScript (demi vers +∞), pas l'arrondi bancaire de Python."""
    return math.floor(x + 0.5)


def pct(n: int, total: int):
    return js_round(n / total * 100) if total else None


def in_window(d: str | None, start: str, end: str) -> bool:
    return bool(d) and start <= d <= end


def zero_by_role() -> dict:
    return {r: 0 for r in PRO_ROLES}


def month_keys(today: date, n: int = 6) -> list[str]:
    out = []
    for i in range(n):
        back = n - 1 - i
        y, m = today.year, today.month - back
        while m <= 0:
            m += 12
            y -= 1
        out.append(f"{y}-{m:02d}")
    return out


@endpoint("GET")
def dashboard(request):
    me = request.user
    if me.role != "directeur":
        raise ApiError("forbidden")
    period = request.GET.get("period") or "mois"
    if period not in PERIOD_DAYS:
        raise ApiError("invalid", "period")

    length = PERIOD_DAYS[period]
    today = timeutil.today()
    d = lambda x: x.isoformat()  # noqa: E731
    to = d(today)
    frm = d(timeutil.add_days(today, -(length - 1)))
    prev_to_date = timeutil.add_days(today, -length)
    prev_to = d(prev_to_date)
    prev_from = d(timeutil.add_days(prev_to_date, -(length - 1)))

    children = list(Child.objects.filter(pole_id=me.pole_id).order_by("code"))
    ids = {c.id for c in children}
    # tous les séjours du pôle : enfants suivis + dossiers clos archivés
    stays = [
        {"entryDate": s["entryDate"], "exitDate": s["exitDate"], "exitDestination": s["exitDestination"]}
        for c in children
        for s in c.journey["stays"]
    ] + [
        {"entryDate": d(a.entry_date), "exitDate": d(a.exit_date), "exitDestination": a.exit_destination}
        for a in ClosedStay.objects.filter(pole_id=me.pole_id)
    ]

    def followed_at(day: str) -> int:
        return sum(1 for s in stays if s["entryDate"] <= day and (not s["exitDate"] or s["exitDate"] > day))

    def entries_in(f, t):
        return sum(1 for s in stays if in_window(s["entryDate"], f, t))

    def exits_in(f, t):
        return [s for s in stays if in_window(s["exitDate"], f, t)]

    def insertion_in(f, t):
        ex = exits_in(f, t)
        return pct(sum(1 for s in ex if s["exitDestination"] in INSERTION), len(ex))

    def returns_in(f, t):
        # retours : un séjour qui n'est pas le premier de l'enfant
        return sum(1 for c in children if any(in_window(s["entryDate"], f, t) for s in c.journey["stays"][1:]))

    exits = exits_in(frm, to)
    durations = [
        (date.fromisoformat(s["exitDate"]) - date.fromisoformat(s["entryDate"])).days for s in exits if s["exitDate"]
    ]
    average_stay = js_round(sum(durations) / len(durations) / 30.44 * 10) / 10 if durations else None

    present = [c for c in children if c.journey["status"] == "present"]
    by_phase = [{"phase": p, "count": sum(1 for c in present if c.journey["phase"] == p)} for p in range(1, 6)]

    # présence sur la période
    attendance = list(AttendanceEntry.objects.filter(child_id__in=ids, date__gte=frm, date__lte=to))
    absences: dict[str, int] = {}
    for a in attendance:
        if a.status != "present":
            absences[a.child_id] = absences.get(a.child_id, 0) + 1

    # humeur moyenne du centre, 6 derniers mois (jamais par enfant)
    mood_by_month = []
    for month in month_keys(today):
        levels = [h["level"] for c in children for h in c.mood["history"] if h["date"].startswith(month)]
        mood_by_month.append(
            {
                "month": month,
                "count": len(levels),
                "average": js_round(sum(levels) / len(levels) * 10) / 10 if levels else None,
            }
        )

    # aides : statut atteint pendant la période
    apps = list(AidApplication.objects.filter(child_id__in=ids))
    aids = {
        "depose": sum(1 for a in apps if a.status == "depose" and in_window(timeutil.iso_d(a.submitted_at), frm, to)),
        "accorde": sum(1 for a in apps if a.status == "accorde" and in_window(timeutil.iso_d(a.decided_at), frm, to)),
        "refuse": sum(1 for a in apps if a.status == "refuse" and in_window(timeutil.iso_d(a.decided_at), frm, to)),
    }

    staff = list(User.objects.filter(pole_id=me.pole_id, is_active=True).exclude(role="directeur").order_by("id"))
    staff_by_role = zero_by_role()
    for u in staff:
        staff_by_role[u.role] += 1

    sessions = list(Session.objects.filter(child_id__in=ids).prefetch_related("recipients"))
    sessions_by_role = zero_by_role()
    for s in sessions:
        if in_window(d(s.date), frm, to):
            sessions_by_role[s.author_role] += 1

    week_ago = d(timeutil.add_days(today, -7))
    stale_unread = sum(
        sum(1 for r in s.recipients.all() if r.read_at is None)
        for s in sessions
        if s.shared_text and timeutil.iso_dt(s.shared_at)[:10] < week_ago
    )

    by_id = {c.id: c for c in children}
    pending_by_role = zero_by_role()
    pending_over_7 = []
    for r in Roadmap.objects.filter(child_id__in=ids).order_by("child__code"):
        for part, p in r.parts.items():
            if not p["pending"]:
                continue
            owner = ROADMAP_OWNERS[part]
            pending_by_role[owner] += 1
            since = p["pending"]["createdAt"][:10]
            if since < week_ago:
                c = by_id[r.child_id]
                pending_over_7.append(
                    {
                        "childId": c.id,
                        "firstName": c.identity["firstName"],
                        "lastName": c.identity["lastName"],
                        "part": part,
                        "owner": owner,
                        "since": since,
                    }
                )

    three_weeks_ago = d(timeutil.add_days(today, -21))
    last_session = {}
    for s in sessions:
        sd = d(s.date)
        if sd > last_session.get(s.child_id, ""):
            last_session[s.child_id] = sd
    no_session_21 = [
        {
            "childId": c.id,
            "firstName": c.identity["firstName"],
            "lastName": c.identity["lastName"],
            "lastSessionDate": last_session.get(c.id),
        }
        for c in present
        if not last_session.get(c.id) or last_session[c.id] < three_weeks_ago
    ]

    pole = me.pole
    return {
        "period": period,
        "poleName": pole.name if pole else "",
        "from": frm,
        "to": to,
        "kpis": {
            "childrenFollowed": {"value": followed_at(to), "previous": followed_at(prev_to)},
            "entries": {"value": entries_in(frm, to), "previous": entries_in(prev_from, prev_to)},
            "exits": {"value": len(exits), "previous": len(exits_in(prev_from, prev_to))},
            "insertionRate": {"value": insertion_in(frm, to), "previous": insertion_in(prev_from, prev_to)},
            "returned12m": {
                "value": returns_in(d(timeutil.add_days(today, -364)), to),
                "previous": returns_in(d(timeutil.add_days(today, -729)), d(timeutil.add_days(today, -365))),
            },
        },
        "byPhase": by_phase,
        "exitDestinations": [
            {"destination": dest, "count": sum(1 for s in exits if s["exitDestination"] == dest)} for dest in DESTINATIONS
        ],
        "averageStayMonths": average_stay,
        "attendance": {
            "rate": pct(sum(1 for a in attendance if a.status == "present"), len(attendance)),
            "childrenWithManyAbsences": sorted(
                (
                    {
                        "childId": c.id,
                        "firstName": c.identity["firstName"],
                        "lastName": c.identity["lastName"],
                        "absences": absences[c.id],
                    }
                    for c in children
                    if absences.get(c.id, 0) > 3
                ),
                key=lambda x: -x["absences"],
            ),
        },
        "moodByMonth": mood_by_month,
        "aids": aids,
        "staffByRole": staff_by_role,
        "childrenPerStaff": sorted(
            (
                {
                    "userId": u.id,
                    "name": u.display_name,
                    "role": u.role,
                    "count": sum(1 for c in present if c.assigned_id(u.role) == u.id),
                }
                for u in staff
            ),
            key=lambda x: PRO_ROLES.index(x["role"]),
        ),
        "sessionsByRole": sessions_by_role,
        "staleUnreadNotes": stale_unread,
        "sensitiveAccess": sum(
            1
            for a in AuditEntry.objects.filter(child_id__in=ids)
            if in_window(timeutil.iso_dt(a.at)[:10], frm, to)
        ),
        "pendingValidationsByRole": pending_by_role,
        "alerts": {"noSession21Days": no_session_21, "roadmapPendingOver7Days": pending_over_7},
    }
