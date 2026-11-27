"""Roadmap commune : lecture, propositions IA, validation / modification / rejet, commentaires (api/roadmap.ts)."""
from .. import serializers as ser
from .. import timeutil
from ..access import ROADMAP_PART_KEYS, can_request_roadmap_update, can_validate_roadmap_part
from ..http import ApiError, body, endpoint, require_child, text
from ..models import Roadmap, Session, new_id
from ..services import close_notifications, generate_proposal, notify
from ..validation import clean, clean_roadmap_content


def _roadmap(child) -> Roadmap:
    r = Roadmap.objects.select_for_update().filter(child=child).first()
    if r is None:
        raise ApiError("not_found")
    return r


def _part_key(key: str) -> str:
    if key not in ROADMAP_PART_KEYS:
        raise ApiError("not_found")
    return key


@endpoint("GET")
def get_roadmap(request, child_id):
    """Lisible par toute l'équipe assignée et par le directeur."""
    return ser.roadmap(_roadmap(require_child(request.user, child_id)))


@endpoint("POST")
def generate(request, child_id):
    """« Mettre à jour la roadmap » : point de branchement de l'IA (cdis/ai/provider.py)."""
    me = request.user
    child = require_child(me, child_id)
    if not can_request_roadmap_update(me.role):
        raise ApiError("forbidden")
    proposed = generate_proposal(child, "demande", me.id)
    return {"roadmap": ser.roadmap(_roadmap(child)), "proposedParts": proposed}


@endpoint("GET")
def sources(request, child_id):
    """Notes citées : métadonnées pour tous, texte de la note pour l'IA SEULEMENT pour son auteur."""
    me = request.user
    require_child(me, child_id)
    qs = (
        Session.objects.filter(child_id=child_id, ai_text__isnull=False)
        .exclude(ai_text="")
        .select_related("author")
        .order_by("date", "created_at")
    )
    return [
        {
            "sessionId": s.id,
            "authorRole": s.author_role,
            "authorName": s.author.display_name,
            "sessionKind": s.details.get("kind"),
            "date": s.date.isoformat(),
            "text": s.ai_text if me.is_professional and s.author_id == me.id else None,
        }
        for s in qs
    ]


@endpoint("POST")
def validate(request, child_id, key):
    """Le responsable valide (tel quel ou modifié). Justification obligatoire s'il modifie."""
    me = request.user
    key = _part_key(key)
    child = require_child(me, child_id)
    if not can_validate_roadmap_part(me.role, key):
        raise ApiError("forbidden")
    data = body(request)
    roadmap = _roadmap(child)
    parts = roadmap.parts
    part = parts[key]
    if not part["pending"]:
        raise ApiError("conflict", "no_pending_proposal")
    modified = data.get("modifiedContent") is not None
    justification = text(data.get("justification"))
    if modified and not justification:
        raise ApiError("invalid", "justification")
    content = clean_roadmap_content(key, data["modifiedContent"]) if modified else part["pending"]["content"]
    now = timeutil.now()
    version = {
        "version": part["validated"]["version"] + 1,
        "content": content,
        "validatedAt": timeutil.iso_dt(now),
        "validatedBy": me.id,
        "decision": "modifie" if modified else "valide",
        "justification": justification,
    }
    part["validated"] = version
    part["history"].append(version)
    part["pending"] = None
    roadmap.parts = parts
    roadmap.updated_at = now
    roadmap.progress_percent = min(100, roadmap.progress_percent + 5)
    roadmap.save()
    if not any(p["pending"] and p["owner"] == me.role for p in parts.values()):
        close_notifications(me.id, child.id, "validation_attendue")
    for uid in child.team_ids:
        if uid != me.id:
            notify(uid, "roadmap_mise_a_jour", child.id)
    return ser.roadmap(roadmap)


@endpoint("POST")
def reject(request, child_id, key):
    """Le responsable rejette ; justification obligatoire. La version précédente reste affichée."""
    me = request.user
    key = _part_key(key)
    child = require_child(me, child_id)
    if not can_validate_roadmap_part(me.role, key):
        raise ApiError("forbidden")
    justification = text(body(request).get("justification"))
    if not justification:
        raise ApiError("invalid", "justification")
    roadmap = _roadmap(child)
    parts = roadmap.parts
    part = parts[key]
    if not part["pending"]:
        raise ApiError("conflict", "no_pending_proposal")
    part["rejected"].append(
        {"proposalId": part["pending"]["id"], "by": me.id, "at": timeutil.now_iso(), "justification": justification}
    )
    part["pending"] = None
    roadmap.parts = parts
    roadmap.save(update_fields=["parts"])
    close_notifications(me.id, child.id, "validation_attendue")
    return ser.roadmap(roadmap)


@endpoint("POST")
def comment(request, child_id, key):
    """Les intervenants commentent une proposition, sans la valider."""
    me = request.user
    key = _part_key(key)
    child = require_child(me, child_id)
    if not can_request_roadmap_update(me.role):
        raise ApiError("forbidden")
    message = text(body(request).get("text"))
    if not message:
        raise ApiError("invalid", "text")
    roadmap = _roadmap(child)
    parts = roadmap.parts
    pending = parts[key]["pending"]
    if not pending:
        raise ApiError("conflict", "no_pending_proposal")
    pending["comments"].append({"id": new_id("cm"), "authorId": me.id, "text": message, "createdAt": timeutil.now_iso()})
    roadmap.parts = parts
    roadmap.save(update_fields=["parts"])
    return ser.roadmap(roadmap)


@endpoint("PUT")
def update_goal(request, child_id):
    """Objectif principal, piste retenue et avancement (équipe d'intervenants)."""
    me = request.user
    child = require_child(me, child_id)
    if not can_request_roadmap_update(me.role):
        raise ApiError("forbidden")
    data = clean({"objective": "text", "careerTrack": "str", "progressPercent": ("range", 0, 100)}, body(request))
    roadmap = _roadmap(child)
    roadmap.objective = data["objective"].strip()
    roadmap.career_track = data["careerTrack"].strip()
    roadmap.progress_percent = data["progressPercent"]
    roadmap.updated_at = timeutil.now()
    roadmap.save()
    return ser.roadmap(roadmap)
