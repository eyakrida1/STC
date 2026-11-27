"""
Journal des accès aux blocs sensibles (Santé, Situation judiciaire) — lu UNIQUEMENT par le directeur de son pôle.
Il ne contient que la trace (qui, quel enfant, quel bloc, quand), jamais le contenu (api/audit.ts).
"""
from .. import timeutil
from ..http import ApiError, endpoint
from ..models import AuditEntry, Child, User
from .stats import PERIOD_DAYS


@endpoint("GET")
def sensitive_access(request):
    me = request.user
    if me.role != "directeur":
        raise ApiError("forbidden")
    child_filter, user_filter = request.GET.get("childId"), request.GET.get("userId")
    period = request.GET.get("period")
    if period and period not in PERIOD_DAYS:
        raise ApiError("invalid", "period")

    children = list(Child.objects.filter(pole_id=me.pole_id).order_by("code"))
    users = {u.id: u for u in User.objects.filter(pole_id=me.pole_id).order_by("id")}
    by_id = {c.id: c for c in children}

    qs = AuditEntry.objects.filter(child_id__in=by_id).order_by("-at")
    if child_filter:
        qs = qs.filter(child_id=child_filter)
    if user_filter:
        qs = qs.filter(user_id=user_filter)
    since = timeutil.add_days(timeutil.today(), -(PERIOD_DAYS[period] - 1)) if period else None

    def name(c):
        return f"{c.identity['firstName']} {c.identity['lastName']}"

    entries = []
    for a in qs:
        if since and timeutil.parse_date(timeutil.iso_dt(a.at)) < since:
            continue
        u = users.get(a.user_id)
        c = by_id[a.child_id]
        entries.append(
            {
                "id": a.id,
                "at": timeutil.iso_dt(a.at),
                "block": "health" if a.action == "ouverture_sante" else "legal",
                "userId": a.user_id,
                "userName": u.display_name if u else a.user_id,
                "userRole": u.role if u else "educateur",
                "childId": c.id,
                "childName": name(c),
            }
        )
    return {
        "entries": entries,
        "children": [{"id": c.id, "name": name(c)} for c in children],
        "users": [{"id": u.id, "name": u.display_name, "role": u.role} for u in users.values()],
    }
