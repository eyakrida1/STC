"""
Séances à 3 sorties et Notes reçues (api/sessions.ts).
Note privée : l'auteur seul · note partagée : destinataires cochés (état lu par destinataire) ·
note pour l'IA : personne d'autre. Correction 24 h par l'auteur, jamais de suppression.
"""
from django.db.models import Prefetch

from .. import serializers as ser
from .. import timeutil
from ..access import SESSION_KIND_BY_ROLE, ai_threshold, can_edit_session
from ..http import ApiError, body, endpoint, require_child, require_professional, text
from ..models import Child, Notification, Session, SharedNoteRecipient, new_id
from ..services import maybe_auto_proposal, notify, pending_ai_note_count
from ..validation import clean_session_details

with_recipients = Prefetch("recipients", queryset=SharedNoteRecipient.objects.order_by("position", "id"))


def _shared_input(data) -> tuple[str | None, list[str]]:
    shared = data.get("sharedNote")
    if shared is None:
        return None, []
    if not isinstance(shared, dict):
        raise ApiError("invalid", "sharedNote")
    ids = shared.get("recipientIds") or []
    if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
        raise ApiError("invalid", "sharedNote.recipientIds")
    return text(shared.get("text")), ids


def _validate_zones(private: str | None, shared_text: str | None, recipient_ids: list[str], ai: str | None):
    """Au moins une zone remplie ; une note partagée a au moins un destinataire."""
    has_shared = bool(shared_text) and bool(recipient_ids)
    if not private and not has_shared and not ai:
        raise ApiError("invalid", "empty")
    if shared_text and not recipient_ids:
        raise ApiError("invalid", "recipients")


def _parse_input(data) -> dict:
    d = timeutil.parse_date(data.get("date"))
    if d is None or d > timeutil.today():
        raise ApiError("invalid", "date")
    shared_text, recipient_ids = _shared_input(data)
    out = {
        "date": d,
        "details": clean_session_details(data.get("details")),
        "private": text(data.get("privateNote")),
        "shared_text": shared_text,
        "recipient_ids": recipient_ids,
        "ai": text(data.get("aiNote")),
    }
    _validate_zones(out["private"], shared_text, recipient_ids, out["ai"])
    return out


def _apply_mood(child: Child, session: Session, me):
    """Seule l'humeur générale est partagée (elle anime l'avatar) ; les autres échelles restent chez le psy."""
    if session.details.get("kind") != "consultation":
        return
    level = session.details["scales"]["humeur"]
    mood = child.mood
    mood["level"] = level
    mood["updatedAt"] = timeutil.now_iso()
    mood["updatedBy"] = me.id
    day = session.date.isoformat()
    same_day = next((h for h in reversed(mood["history"]) if h["date"] == day), None)
    if same_day:
        same_day["level"] = level
    else:
        mood["history"].append({"date": day, "level": level})
        mood["history"].sort(key=lambda h: h["date"])
    child.mood = mood
    child.save(update_fields=["mood"])


def _result(session_id: str, child: Child, proposed: bool) -> dict:
    s = Session.objects.prefetch_related(with_recipients).get(pk=session_id)
    child.refresh_from_db()
    return {"session": ser.session(s), "child": ser.child(child), "roadmapProposed": proposed}


@endpoint("GET")
def list_my_sessions(request, child_id):
    """Mes séances sur un enfant (l'auteur seul voit ses séances complètes), plus récente en haut."""
    me = request.user
    require_child(me, child_id)
    require_professional(me)
    qs = (
        Session.objects.filter(child_id=child_id, author=me)
        .prefetch_related(with_recipients)
        .order_by("-date", "-created_at")
    )
    return [ser.session(s) for s in qs]


@endpoint("GET")
def get_my_session(request, session_id):
    s = Session.objects.prefetch_related(with_recipients).filter(pk=session_id).first()
    if s is None:
        raise ApiError("not_found")
    if s.author_id != request.user.id:
        raise ApiError("forbidden")
    return ser.session(s)


@endpoint("GET")
def ai_note_status(request, child_id):
    """Compteur « 3 / 5 notes pour l'IA avant mise à jour automatique »."""
    me = request.user
    require_child(me, child_id)
    require_professional(me)
    return {"pending": pending_ai_note_count(child_id), "threshold": ai_threshold()}


@endpoint("POST")
def create_session(request):
    """Enregistre une séance ; livre les notes partagées ; met à jour l'humeur si consultation ; IA au seuil."""
    me = request.user
    require_professional(me)
    data = body(request)
    child = require_child(me, str(data.get("childId", "")))
    inp = _parse_input(data)
    if inp["details"]["kind"] != SESSION_KIND_BY_ROLE[me.role]:
        raise ApiError("invalid", "details.kind")

    team = child.team_ids
    recipients = list(dict.fromkeys(i for i in inp["recipient_ids"] if i != me.id and i in team))
    now = timeutil.now()
    shared = inp["shared_text"] if inp["shared_text"] and recipients else None
    s = Session.objects.create(
        id=new_id("se"),
        child=child,
        author=me,
        author_role=me.role,
        date=inp["date"],
        created_at=now,
        details=inp["details"],
        private_note=inp["private"],
        shared_text=shared,
        shared_at=now if shared else None,
        ai_text=inp["ai"],
    )
    if shared:
        for pos, uid in enumerate(recipients):
            SharedNoteRecipient.objects.create(session=s, user_id=uid, position=pos)
            notify(uid, "note_recue", child.id)
    _apply_mood(child, s, me)
    proposed = bool(inp["ai"]) and maybe_auto_proposal(child, ai_threshold())
    return _result(s.id, child, proposed)


@endpoint("PUT")
def update_my_session(request, session_id):
    """
    Correction par l'auteur pendant 24 h. Une zone remplie ne peut pas être vidée, les destinataires déjà servis
    sont conservés (on peut en ajouter), une note déjà utilisée par l'IA est figée.
    """
    me = request.user
    s = Session.objects.select_for_update().filter(pk=session_id).first()
    if s is None:
        raise ApiError("not_found")
    if s.author_id != me.id:
        raise ApiError("forbidden")
    if not can_edit_session(s):
        raise ApiError("conflict", "edit_window_closed")
    child = require_child(me, s.child_id)
    inp = _parse_input(body(request))
    if inp["details"]["kind"] != s.details.get("kind"):
        raise ApiError("invalid", "details.kind")
    if (s.private_note and not inp["private"]) or (s.shared_text and not inp["shared_text"]) or (s.ai_text and not inp["ai"]):
        raise ApiError("invalid", "cannot_clear_zone")

    now = timeutil.now()
    s.date = inp["date"]
    s.details = inp["details"]
    s.private_note = inp["private"]

    if inp["shared_text"]:
        team = child.team_ids
        wanted = list(dict.fromkeys(i for i in inp["recipient_ids"] if i != me.id and i in team))
        existing = {r.user_id: r for r in s.recipients.all()}
        if not s.shared_text:
            s.shared_at = now
        text_changed = bool(s.shared_text) and s.shared_text != inp["shared_text"]
        s.shared_text = inp["shared_text"]
        pos = len(existing)
        for uid in wanted:
            if uid not in existing:
                SharedNoteRecipient.objects.create(session=s, user_id=uid, position=pos)
                pos += 1
                notify(uid, "note_recue", child.id)
        if text_changed:
            # le texte a changé : chaque destinataire doit la relire
            s.recipients.update(read_at=None)
            for uid in existing:
                notify(uid, "note_recue", child.id)

    proposed = False
    if inp["ai"]:
        if not s.ai_text:
            s.ai_text = inp["ai"]
            s.updated_at = now
            s.save()
            proposed = maybe_auto_proposal(child, ai_threshold())
            s.refresh_from_db()
        elif not s.ai_consumed_by:
            s.ai_text = inp["ai"]

    s.updated_at = now
    s.save()
    _apply_mood(child, s, me)
    return _result(s.id, child, proposed)


@endpoint("GET")
def list_received_notes(request):
    """Notes partagées dont je suis destinataire (un enfant, ou tous mes enfants)."""
    me = request.user
    require_professional(me)
    child_id = request.GET.get("childId")
    if child_id:
        require_child(me, child_id)
    qs = SharedNoteRecipient.objects.filter(user=me, session__shared_text__isnull=False).select_related(
        "session", "session__author"
    )
    if child_id:
        qs = qs.filter(session__child_id=child_id)
    else:
        # enfants toujours visibles (une affectation a pu changer)
        qs = qs.filter(**{f"session__child__{me.role}_id": me.id})
    notes = []
    for r in qs:
        s, author = r.session, r.session.author
        notes.append(
            {
                "sessionId": s.id,
                "childId": s.child_id,
                "authorId": author.id,
                "authorName": author.display_name,
                "authorRole": s.author_role,
                "authorAvatarSeed": author.avatar_seed,
                "sessionKind": s.details.get("kind"),
                "sessionDate": s.date.isoformat(),
                "sharedAt": timeutil.iso_dt(s.shared_at),
                "text": s.shared_text,
                "readAt": timeutil.iso_dt(r.read_at),
            }
        )
    notes.sort(key=lambda n: n["sharedAt"] or "", reverse=True)
    return notes


def _sync_note_notifications(user_id: str, child_id: str):
    """Plus aucune note non lue sur cet enfant → la notification « note reçue » est lue aussi."""
    still_unread = SharedNoteRecipient.objects.filter(
        user_id=user_id, session__child_id=child_id, read_at__isnull=True
    ).exists()
    if not still_unread:
        Notification.objects.filter(
            user_id=user_id, child_id=child_id, kind="note_recue", read_at__isnull=True
        ).update(read_at=timeutil.now())


@endpoint("POST")
def mark_note_read(request, session_id):
    """Ouvrir une note la marque comme lue pour ce lecteur seulement."""
    me = request.user
    mine = SharedNoteRecipient.objects.select_related("session").filter(session_id=session_id, user=me).first()
    if mine is None:
        raise ApiError("not_found")
    if mine.read_at is None:
        mine.read_at = timeutil.now()
        mine.save(update_fields=["read_at"])
        _sync_note_notifications(me.id, mine.session.child_id)
    return None


@endpoint("POST")
def mark_all_notes_read(request, child_id):
    me = request.user
    require_child(me, child_id)
    SharedNoteRecipient.objects.filter(user=me, session__child_id=child_id, read_at__isnull=True).update(
        read_at=timeutil.now()
    )
    _sync_note_notifications(me.id, child_id)
    return None
