"""Règles métier partagées par plusieurs vues : notifications, notes pour l'IA, génération des propositions."""
from . import timeutil
from .access import PART_SOURCES, ROADMAP_OWNERS, ROADMAP_PART_KEYS
from .ai.provider import safe_draft
from .http import ApiError
from .models import Child, Notification, Session, new_id


# ───────────────────────────── Notifications
def notify(user_id: str | None, kind: str, child_id: str | None):
    """Crée une notification, sans doublon non lu pour le même enfant et le même type (on la rafraîchit)."""
    if not user_id:
        return
    existing = Notification.objects.filter(user_id=user_id, kind=kind, child_id=child_id, read_at__isnull=True).first()
    if existing:
        existing.created_at = timeutil.now()
        existing.save(update_fields=["created_at"])
        return
    Notification.objects.create(
        id=new_id("notif"), user_id=user_id, kind=kind, child_id=child_id, created_at=timeutil.now()
    )


def close_notifications(user_id: str, child_id: str, kind: str):
    Notification.objects.filter(user_id=user_id, child_id=child_id, kind=kind, read_at__isnull=True).update(
        read_at=timeutil.now()
    )


# ───────────────────────────── Notes pour l'IA
def pending_ai_notes(child_id: str):
    return Session.objects.filter(child_id=child_id, ai_text__isnull=False, ai_consumed_by__isnull=True).exclude(ai_text="")


def pending_ai_note_count(child_id: str) -> int:
    return pending_ai_notes(child_id).count()


# ───────────────────────────── Propositions de roadmap
def generate_proposal(child: Child, trigger: str, requested_by: str | None) -> list[str]:
    """
    Produit une proposition partie par partie à partir des notes pour l'IA non utilisées.
    Une partie dont les données n'ont pas changé n'est pas reproposée. Les notes lues sont consommées
    (elles ne comptent plus pour le seuil). Renvoie les parties proposées.
    """
    roadmap = getattr(child, "roadmap", None)
    if roadmap is None:
        raise ApiError("not_found")
    notes = list(pending_ai_notes(child.id).order_by("date", "created_at"))
    aids = [
        {"program": a.program.label, "status": a.status}
        for a in child.aid_applications.select_related("program").all()
    ]
    context = {"today": timeutil.today().isoformat(), "aids": aids}
    parts = roadmap.parts
    proposed = []

    for key in ROADMAP_PART_KEYS:
        part = parts[key]
        sources = [
            {"sessionId": s.id, "authorRole": s.author_role, "date": s.date.isoformat(), "text": s.ai_text}
            for s in notes
            if s.author_role in PART_SOURCES[key]
        ]
        current = (part["pending"] or {}).get("content") or part["validated"]["content"]
        draft = safe_draft(key, current, sources, context)
        if not draft:
            continue
        previous = part["pending"] or {}
        part["pending"] = {
            "id": new_id("pr"),
            "createdAt": timeutil.now_iso(),
            "trigger": trigger,
            "requestedBy": requested_by,
            "content": draft["content"],
            "changes": [*previous.get("changes", []), *draft["changes"]],
            "comments": previous.get("comments", []),
        }
        proposed.append(key)
        notify(child.assigned_id(ROADMAP_OWNERS[key]), "validation_attendue", child.id)

    stamp = new_id("gen")
    Session.objects.filter(pk__in=[s.pk for s in notes]).update(ai_consumed_by=stamp)
    roadmap.parts = parts
    roadmap.save(update_fields=["parts"])
    return proposed


def maybe_auto_proposal(child: Child, threshold: int) -> bool:
    if pending_ai_note_count(child.id) < threshold:
        return False
    generate_proposal(child, "auto", None)
    return True
