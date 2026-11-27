"""
Chargement de la base de démonstration (port de frontend/src/mocks/construire.ts + index.ts › buildSeed).
`load_demo()` efface TOUTES les données métier et recharge la démo. Les comptes superutilisateur sont conservés.
"""
import copy
from datetime import date

from django.db import transaction

from .. import timeutil
from ..models import (
    Activity,
    AidApplication,
    AidProgram,
    AttendanceEntry,
    AuditEntry,
    Child,
    ClosedStay,
    Notification,
    Pole,
    Roadmap,
    Session,
    SharedNoteRecipient,
    User,
)
from . import donnees as D
from .dates import at, days_ago


def _dt(value: str):
    """ISODateTime « …Z » → datetime aware."""
    from datetime import datetime

    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _wipe():
    # le journal d'audit refuse delete() : effacement brut, réservé à la réinitialisation de la démo
    AuditEntry.objects.all()._raw_delete(AuditEntry.objects.db)
    Notification.objects.all().delete()
    SharedNoteRecipient.objects.all().delete()
    Session.objects.all().delete()
    for model in (Roadmap, AttendanceEntry, Activity, AidApplication, AidProgram, ClosedStay, Child):
        model.objects.all().delete()
    User.objects.filter(is_superuser=False).delete()
    Pole.objects.filter(users__isnull=True).delete()


def _seeded(seed: int):
    """Générateur pseudo-aléatoire identique à celui du front (présence stable à chaque réinitialisation)."""
    s = seed

    def rand():
        nonlocal s
        s = (s * 9301 + 49297) % 233280
        return s / 233280

    return rand


def build_attendance(entry_dates: dict[str, str]) -> list[AttendanceEntry]:
    out = []
    rand = _seeded(42)
    for child_id, entry in entry_dates.items():
        for n in range(60, 0, -1):
            d = days_ago(n)
            if date.fromisoformat(d).isoweekday() == 7:
                continue  # dimanche fermé
            if d < entry:
                continue
            status, reason = "present", None
            r = rand()
            if n in D.FORCED_ABSENCES.get(child_id, []):
                status = "absent"
            elif r < D.ABSENCE_RATE[child_id]:
                justified = rand() < 0.4
                status = "absent_justifie" if justified else "absent"
                reason = D.REASONS[int(rand() * len(D.REASONS))] if justified else None
            out.append(AttendanceEntry(child_id=child_id, date=d, status=status, reason=reason))
    return out


def _part(owner: str, by: str, validated_at: str, content: dict) -> dict:
    v = {"version": 1, "content": content, "validatedAt": validated_at, "validatedBy": by, "decision": "initiale", "justification": None}
    return {"owner": owner, "validated": v, "pending": None, "history": [copy.deepcopy(v)], "rejected": []}


@transaction.atomic
def load_demo():
    _wipe()
    A = D.DEFAULT_ASSIGNMENTS

    for p in D.POLES:
        Pole.objects.update_or_create(id=p["id"], defaults={"name": p["name"], "city": p["city"]})

    for u in D.USERS:
        user = User(
            id=u["id"],
            username=u["username"],
            role=u["role"],
            first_name=u["firstName"],
            last_name=u["lastName"],
            birth_date=u["birthDate"],
            phone=u["phone"],
            email=u["email"],
            cin=u["cin"],
            pole_id=u["poleId"],
            avatar_seed=u["avatarSeed"],
        )
        user.set_password(D.CREDENTIALS[u["username"]])
        user.save()

    children = D.donnees_enfants()
    for c in children:
        Child.objects.create(
            id=c["id"],
            code=c["code"],
            pole_id=c["poleId"],
            **{k: c[k] for k in ("identity", "journey", "family", "economic", "schooling", "health", "legal", "interests", "mood", "consent")},
            educateur_id=A["educateur"],
            psychologue_id=A["psychologue"],
            social_id=A["social"],
        )

    for s in D.donnees_seances():
        created = _dt(at(s["date"], 16, 30))
        shared = s.get("shared")
        ai = s.get("ai")
        session = Session.objects.create(
            id=s["id"],
            child_id=s["childId"],
            author_id=A[s["role"]],
            author_role=s["role"],
            date=s["date"],
            created_at=created,
            details=s["details"],
            private_note=s.get("privateNote"),
            shared_text=shared["text"] if shared else None,
            shared_at=created if shared else None,
            ai_text=ai["text"] if ai else None,
            ai_consumed_by=ai.get("consumed") if ai else None,
        )
        for pos, (role, read_days_ago) in enumerate(shared["to"] if shared else []):
            SharedNoteRecipient.objects.create(
                session=session,
                user_id=A[role],
                position=pos,
                read_at=None if read_days_ago is None else _dt(at(days_ago(read_days_ago), 9)),
            )

    roadmaps = {}
    for r in D.donnees_roadmaps():
        roadmaps[r["childId"]] = {
            "spec": r,
            "parts": {
                "education": _part("educateur", A["educateur"], r["validatedAt"], r["education"]),
                "psychologique": _part("psychologue", A["psychologue"], r["validatedAt"], r["psy"]),
                "sociale": _part("social", A["social"], r["validatedAt"], r["social"]),
            },
        }
    D.propositions_en_attente({k: {"parts": v["parts"]} for k, v in roadmaps.items()})
    for child_id, r in roadmaps.items():
        spec = r["spec"]
        Roadmap.objects.create(
            child_id=child_id,
            objective=spec["objective"],
            career_track=spec["careerTrack"],
            progress_percent=spec["progressPercent"],
            updated_at=_dt(spec["validatedAt"]),
            parts=r["parts"],
        )

    AttendanceEntry.objects.bulk_create(build_attendance({c["id"]: c["journey"]["entryDate"] for c in children}))

    Activity.objects.bulk_create(
        Activity(id=i, child_id=c, weekday=w, start=s, end=e, title=t, objective=o, week_start=None)
        for i, c, w, s, e, t, o in D.ACTIVITES
    )

    for pos, p in enumerate(D.AID_PROGRAMS):
        AidProgram.objects.create(id=p["id"], label=p["label"], position=pos)
    for pos, a in enumerate(D.donnees_demandes_aides()):
        AidApplication.objects.create(
            id=a["id"],
            child_id=a["childId"],
            program_id=a["programId"],
            beneficiary=a["beneficiary"],
            status=a["status"],
            submitted_at=a["submittedAt"],
            decided_at=a["decidedAt"],
            missing_documents=a["missingDocuments"],
            position=pos,
        )

    for nid, uid, kind, child_id, d, read in D.NOTIFICATIONS:
        Notification.objects.create(
            id=nid,
            user_id=uid,
            kind=kind,
            child_id=child_id,
            created_at=_dt(at(days_ago(d), 17)),
            read_at=_dt(at(days_ago(max(d - 1, 0)), 9)) if read else None,
        )

    for i, (entry, exit_, dest) in enumerate(D.DOSSIERS_CLOS, start=1):
        ClosedStay.objects.create(
            id=f"arch-{i}", pole_id="pole-tunis", entry_date=days_ago(entry), exit_date=days_ago(exit_), exit_destination=dest
        )

    for i, (uid, child_id, action, d, hour) in enumerate(D.OUVERTURES_SENSIBLES, start=1):
        AuditEntry.objects.create(id=f"audit-seed-{i}", user_id=uid, child_id=child_id, action=action, at=_dt(at(days_ago(d), hour, 12)))

    return timeutil.now()
