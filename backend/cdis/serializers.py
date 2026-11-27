"""Modèles → objets JSON du contrat (frontend/src/types/domain.ts), en camelCase."""
from .models import (
    Activity,
    AidApplication,
    AidProgram,
    AttendanceEntry,
    Child,
    Notification,
    Pole,
    Roadmap,
    Session,
    User,
)
from .timeutil import iso_d, iso_dt


def user(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "firstName": u.first_name,
        "lastName": u.last_name,
        "birthDate": iso_d(u.birth_date) or "",
        "phone": u.phone,
        "email": u.email,
        "cin": u.cin,
        "poleId": u.pole_id or "",
        "avatarSeed": u.avatar_seed,
        "photoUrl": u.photo_url,
    }


def team_member(u: User) -> dict:
    return {"id": u.id, "firstName": u.first_name, "lastName": u.last_name, "role": u.role, "avatarSeed": u.avatar_seed}


def pole(p: Pole) -> dict:
    return {"id": p.id, "name": p.name, "city": p.city}


def child(c: Child) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "poleId": c.pole_id,
        "identity": c.identity,
        "journey": c.journey,
        "family": c.family,
        "economic": c.economic,
        "schooling": c.schooling,
        "health": c.health,
        "legal": c.legal,
        "interests": c.interests,
        "mood": c.mood,
        "consent": c.consent,
        "assigned": {
            "educateur": c.educateur_id or "",
            "psychologue": c.psychologue_id or "",
            "social": c.social_id or "",
        },
    }


def session(s: Session) -> dict:
    """Séance complète : réservée à son auteur (les vues le vérifient)."""
    shared = None
    if s.shared_text:
        shared = {
            "text": s.shared_text,
            "sharedAt": iso_dt(s.shared_at),
            "recipients": [{"userId": r.user_id, "readAt": iso_dt(r.read_at)} for r in s.recipients.all()],
        }
    return {
        "id": s.id,
        "childId": s.child_id,
        "authorId": s.author_id,
        "authorRole": s.author_role,
        "date": iso_d(s.date),
        "createdAt": iso_dt(s.created_at),
        "updatedAt": iso_dt(s.updated_at),
        "details": s.details,
        "privateNote": s.private_note,
        "sharedNote": shared,
        "aiNote": {"text": s.ai_text, "consumedByProposalId": s.ai_consumed_by} if s.ai_text else None,
    }


def roadmap(r: Roadmap) -> dict:
    return {
        "childId": r.child_id,
        "objective": r.objective,
        "careerTrack": r.career_track,
        "progressPercent": r.progress_percent,
        "updatedAt": iso_dt(r.updated_at),
        "parts": r.parts,
    }


def attendance(a: AttendanceEntry) -> dict:
    return {"childId": a.child_id, "date": iso_d(a.date), "status": a.status, "reason": a.reason}


def activity(a: Activity) -> dict:
    return {
        "id": a.id,
        "childId": a.child_id,
        "weekday": a.weekday,
        "start": a.start,
        "end": a.end,
        "title": a.title,
        "objective": a.objective,
        "weekStart": iso_d(a.week_start),
    }


def aid_program(p: AidProgram) -> dict:
    return {"id": p.id, "label": p.label}


def aid_application(a: AidApplication, *, with_documents: bool = True) -> dict:
    return {
        "id": a.id,
        "childId": a.child_id,
        "programId": a.program_id,
        "beneficiary": a.beneficiary,
        "status": a.status,
        "submittedAt": iso_d(a.submitted_at),
        "decidedAt": iso_d(a.decided_at),
        # pièces manquantes : détail de travail de l'intervenant social
        "missingDocuments": a.missing_documents if with_documents else "",
    }


def notification(n: Notification) -> dict:
    return {
        "id": n.id,
        "userId": n.user_id,
        "kind": n.kind,
        "childId": n.child_id,
        "createdAt": iso_dt(n.created_at),
        "readAt": iso_dt(n.read_at),
        "childFirstName": n.child.identity.get("firstName") if n.child_id else None,
    }
