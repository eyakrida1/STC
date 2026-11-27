"""Présence, planning d'activités, aides de l'État, échelles d'humeur (api/followup.ts)."""
import re

from .. import serializers as ser
from .. import timeutil
from ..access import (
    can_edit_activities,
    can_edit_aids,
    can_edit_attendance,
    can_read_activities,
    can_read_attendance,
)
from ..http import ApiError, body, endpoint, require_child, text
from ..models import Activity, AidApplication, AidProgram, AttendanceEntry, Session, new_id
from ..validation import clean

TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


# ───────────────────────────── Présence (saisie : éducateur ; lecture : psy, social)
@endpoint("GET")
def get_attendance(request, child_id):
    me = request.user
    require_child(me, child_id)
    if not can_read_attendance(me.role):
        raise ApiError("forbidden")
    start, end = timeutil.parse_date(request.GET.get("from")), timeutil.parse_date(request.GET.get("to"))
    if start is None or end is None:
        raise ApiError("invalid", "from/to")
    qs = AttendanceEntry.objects.filter(child_id=child_id, date__gte=start, date__lte=end).order_by("date")
    return [ser.attendance(a) for a in qs]


@endpoint("PUT")
def set_attendance(request):
    me = request.user
    data = clean(
        {"childId": "text", "date": "date", "status": ("enum", ("present", "absent", "absent_justifie")), "reason": "str?"},
        body(request),
    )
    child = require_child(me, data["childId"])
    if not can_edit_attendance(me.role):
        raise ApiError("forbidden")
    d = timeutil.parse_date(data["date"])
    if d > timeutil.today():
        raise ApiError("invalid", "future")  # pas de saisie dans le futur
    if d.isoweekday() == 7:
        raise ApiError("invalid", "sunday")  # centre fermé le dimanche
    reason = text(data["reason"])
    if data["status"] == "absent_justifie" and not reason:
        raise ApiError("invalid", "reason")  # motif obligatoire
    if data["status"] == "present":
        reason = None
    entry, _ = AttendanceEntry.objects.update_or_create(
        child=child, date=d, defaults={"status": data["status"], "reason": reason}
    )
    return ser.attendance(entry)


# ───────────────────────────── Planning d'activités (éducateur ; psy en lecture)
@endpoint("GET")
def list_activities(request, child_id):
    """Activités de chaque semaine + activités ponctuelles de la semaine demandée (lundi = weekStart)."""
    me = request.user
    require_child(me, child_id)
    if not can_read_activities(me.role):
        raise ApiError("forbidden")
    week = timeutil.parse_date(request.GET.get("weekStart"))
    qs = Activity.objects.filter(child_id=child_id)
    items = [a for a in qs if a.week_start is None or a.week_start == week]
    items.sort(key=lambda a: (a.weekday, a.start))
    return [ser.activity(a) for a in items]


ACTIVITY_SCHEMA = {
    "id?": "str?",
    "childId": "text",
    "weekday": ("range", 1, 6),
    "start": "text",
    "end": "text",
    "title": "text",
    "objective": "str",
    "weekStart": "date?",
}


@endpoint("POST")
def save_activity(request):
    """Création (sans id) ou modification (avec id) d'une activité."""
    me = request.user
    data = clean(ACTIVITY_SCHEMA, body(request))
    child = require_child(me, data["childId"])
    if not can_edit_activities(me.role):
        raise ApiError("forbidden")
    if not TIME.match(data["start"]) or not TIME.match(data["end"]) or data["start"] >= data["end"]:
        raise ApiError("invalid", "time")
    week = timeutil.parse_date(data.get("weekStart"))
    if week is not None and week.isoweekday() != 1:
        raise ApiError("invalid", "weekStart")
    activity_id = data.get("id")
    if activity_id:
        activity = Activity.objects.filter(pk=activity_id).first()
        if activity is None:
            raise ApiError("not_found")
        if activity.child_id != child.id:
            raise ApiError("forbidden")  # pas de déplacement d'une activité vers un autre enfant
    else:
        activity = Activity(id=new_id("a"), child=child)
    activity.weekday = data["weekday"]
    activity.start, activity.end = data["start"], data["end"]
    activity.title = data["title"].strip()
    activity.objective = data["objective"].strip()
    activity.week_start = week
    activity.save()
    return ser.activity(activity)


@endpoint("DELETE")
def delete_activity(request, activity_id):
    me = request.user
    activity = Activity.objects.filter(pk=activity_id).first()
    if activity is None:
        raise ApiError("not_found")
    require_child(me, activity.child_id)
    if not can_edit_activities(me.role):
        raise ApiError("forbidden")
    activity.delete()
    return None


# ───────────────────────────── Aides de l'État (social ; toute l'équipe voit le statut)
@endpoint("GET")
def list_aid_programs(request):
    return [ser.aid_program(p) for p in AidProgram.objects.all()]


@endpoint("GET")
def list_aid_applications(request, child_id):
    me = request.user
    require_child(me, child_id)
    full = can_edit_aids(me.role)
    return [ser.aid_application(a, with_documents=full) for a in AidApplication.objects.filter(child_id=child_id)]


AID_SCHEMA = {
    "id?": "str?",
    "childId": "text",
    "programId": "text",
    "beneficiary": ("enum", ("enfant", "famille")),
    "status": ("enum", ("a_preparer", "depose", "accorde", "refuse")),
    "submittedAt": "date?",
    "decidedAt": "date?",
    "missingDocuments": "str",
}


@endpoint("POST")
def save_aid_application(request):
    me = request.user
    data = clean(AID_SCHEMA, body(request))
    child = require_child(me, data["childId"])
    if not can_edit_aids(me.role):
        raise ApiError("forbidden")
    if data["status"] != "a_preparer" and not data["submittedAt"]:
        raise ApiError("invalid", "submittedAt")  # date de dépôt obligatoire
    if data["status"] in ("accorde", "refuse") and not data["decidedAt"]:
        raise ApiError("invalid", "decidedAt")  # date de décision obligatoire
    program = AidProgram.objects.filter(pk=data["programId"]).first()
    if program is None:
        raise ApiError("invalid", "programId")
    app_id = data.get("id")
    if app_id:
        app = AidApplication.objects.filter(pk=app_id).first()
        if app is None:
            raise ApiError("not_found")
        if app.child_id != child.id:
            raise ApiError("forbidden")
    else:
        last = AidApplication.objects.order_by("-position").values_list("position", flat=True).first() or 0
        app = AidApplication(id=new_id("ap"), child=child, position=last + 1)
    app.program = program
    app.beneficiary = data["beneficiary"]
    app.status = data["status"]
    app.submitted_at = timeutil.parse_date(data["submittedAt"])
    app.decided_at = timeutil.parse_date(data["decidedAt"])
    app.missing_documents = data["missingDocuments"]
    app.save()
    return ser.aid_application(app)


# ───────────────────────────── Échelles d'humeur (psychologue uniquement)
@endpoint("GET")
def list_mood_scales(request, child_id):
    me = request.user
    require_child(me, child_id)
    if me.role != "psychologue":
        raise ApiError("forbidden")
    qs = Session.objects.filter(child_id=child_id, author=me).order_by("date", "created_at")
    return [
        {"sessionId": s.id, "date": s.date.isoformat(), "scales": s.details["scales"]}
        for s in qs
        if s.details.get("kind") == "consultation"
    ]
