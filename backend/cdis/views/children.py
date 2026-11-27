"""Mes enfants, partie commune du dossier, phase, équipe, ouverture des blocs sensibles (api/children.ts)."""
from django.db.models import Max

from .. import serializers as ser
from .. import timeutil
from ..access import (
    AUDITED_BLOCKS,
    CHILD_BLOCKS,
    EDITABLE_BLOCKS,
    PRO_ROLES,
    allowed_phase_targets,
    can_edit_block,
    can_edit_phase,
    can_see_child,
)
from ..http import ApiError, body, endpoint, require_child, text
from ..models import AttendanceEntry, AuditEntry, Child, SharedNoteRecipient, User, new_id
from ..validation import clean_block


def age_from(birth: str, today) -> int:
    b = timeutil.parse_date(birth)
    if b is None:
        return 0
    return today.year - b.year - ((today.month, today.day) < (b.month, b.day))


def summarize(child: Child, me, today) -> dict:
    unread = (
        SharedNoteRecipient.objects.filter(session__child=child, user=me, read_at__isnull=True).count()
        if me.is_professional
        else 0
    )
    roadmap = getattr(child, "roadmap", None)
    pending_validation = bool(roadmap) and any(
        p["owner"] == me.role and p["pending"] is not None for p in roadmap.parts.values()
    )
    recent_absences = AttendanceEntry.objects.filter(
        child=child, status="absent", date__gte=timeutil.add_days(today, -7)
    ).count()
    last = child.sessions.aggregate(m=Max("created_at"))["m"]
    ident, journey = child.identity, child.journey
    return {
        "id": child.id,
        "code": child.code,
        "firstName": ident["firstName"],
        "lastName": ident["lastName"],
        "age": age_from(ident["birthDate"], today),
        "sex": ident["sex"],
        "avatarSeed": ident["avatarSeed"],
        "phase": journey["phase"],
        "status": journey["status"],
        "mood": child.mood["level"],
        "moodUpdatedAt": child.mood["updatedAt"],
        "unreadNotes": unread,
        "pendingValidation": pending_validation,
        "recentAbsences": recent_absences,
        "returned": len(journey["stays"]) > 1,
        "lastActivityAt": timeutil.iso_dt(last),
    }


@endpoint("GET")
def list_children(request):
    """Intervenant → enfants assignés uniquement ; directeur → tous les enfants du pôle."""
    me = request.user
    today = timeutil.today()
    qs = Child.objects.filter(pole_id=me.pole_id).select_related("roadmap").order_by("code")
    if me.is_professional:
        qs = qs.filter(**{f"{me.role}_id": me.id})
    return [summarize(c, me, today) for c in qs if can_see_child(me, c)]


@endpoint("GET")
def get_child(request, child_id):
    """Partie commune du dossier ; le directeur la lit (lecture seule)."""
    return ser.child(require_child(request.user, child_id))


@endpoint("POST")
def log_block_opened(request, child_id):
    """Ouverture d'un bloc Santé / Situation judiciaire → journal d'audit (qui, quel enfant, quel bloc, quand)."""
    me = request.user
    child = require_child(me, child_id)
    block = body(request).get("block")
    if block not in CHILD_BLOCKS:
        raise ApiError("invalid", "block")
    if block in AUDITED_BLOCKS:
        AuditEntry.objects.create(
            id=new_id("audit"),
            user=me,
            child=child,
            action="ouverture_sante" if block == "health" else "ouverture_judiciaire",
            at=timeutil.now(),
        )
    return None


@endpoint("PUT")
def update_block(request, child_id, block):
    """Modifie un bloc de la partie commune ; seul son propriétaire en a le droit."""
    me = request.user
    child = require_child(me, child_id)
    if block not in EDITABLE_BLOCKS:
        raise ApiError("not_found" if block not in CHILD_BLOCKS else "forbidden")
    if not can_edit_block(me.role, block):
        raise ApiError("forbidden")
    value = clean_block(block, body(request).get("value"))

    if block == "journey":
        # la phase, l'historique et les séjours passés ne se modifient pas ici (set_phase, sorties)
        journey = child.journey
        journey["referredBy"] = value["referredBy"]
        journey["entryDate"] = value["entryDate"]
        if journey["stays"]:
            journey["stays"][-1]["entryDate"] = value["entryDate"]
        child.journey = journey
    elif block == "identity":
        # portrait stylisé : produit par le serveur du centre, jamais fourni par le client
        value["avatarUrl"] = child.identity.get("avatarUrl")
        if value["avatarUrl"] is None:
            value.pop("avatarUrl")
        child.identity = value
    else:
        setattr(child, block, value)
    child.save(update_fields=[block])
    return ser.child(child)


@endpoint("POST")
def set_phase(request, child_id):
    """Changement de phase du parcours : toute l'équipe d'intervenants, commentaire obligatoire."""
    me = request.user
    child = require_child(me, child_id)
    if not can_edit_phase(me.role):
        raise ApiError("forbidden")
    data = body(request)
    phase, comment = data.get("phase"), text(data.get("comment"))
    journey = child.journey
    if not isinstance(phase, int) or phase not in allowed_phase_targets(journey["phase"]):
        raise ApiError("invalid", "phase")
    if not comment:
        raise ApiError("invalid", "comment")
    journey["phase"] = phase
    journey["phaseHistory"].append(
        {
            "phase": phase,
            "enteredAt": timeutil.today().isoformat(),
            "stayId": journey["stays"][-1]["id"],
            "by": me.id,
            "comment": comment,
        }
    )
    child.journey = journey
    child.save(update_fields=["journey"])
    return ser.child(child)


@endpoint("GET")
def child_team(request, child_id):
    """Équipe qui suit l'enfant (noms, rôles, photos) — pour l'en-tête du dossier."""
    child = require_child(request.user, child_id)
    users = User.objects.in_bulk([i for i in (child.assigned_id(r) for r in PRO_ROLES) if i])
    out = []
    for role in PRO_ROLES:
        u = users.get(child.assigned_id(role))
        if u:
            out.append(
                {
                    "id": u.id,
                    "firstName": u.first_name,
                    "lastName": u.last_name,
                    "role": role,
                    "avatarSeed": u.avatar_seed,
                    "photoUrl": u.photo_url,
                }
            )
    return out
