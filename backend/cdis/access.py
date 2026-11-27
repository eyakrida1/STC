"""
Règles d'accès par rôle — port de frontend/src/lib/access.ts.
Ici elles font foi : le front ne s'en sert que pour adapter l'affichage.
"""
from datetime import timedelta

from django.conf import settings

from . import timeutil

PRO_ROLES = ("educateur", "psychologue", "social")


def is_professional(role: str) -> bool:
    return role in PRO_ROLES


# Propriétaire(s) de chaque bloc de la partie commune : eux seuls le modifient, les autres le lisent.
BLOCK_EDITORS = {
    "identity": ["social"],
    "journey": ["social"],  # la phase elle-même : toute l'équipe (set_phase)
    "family": ["social"],
    "economic": ["social"],
    "schooling": ["educateur"],
    "health": ["social", "psychologue"],
    "legal": ["social", "psychologue"],
    "interests": ["educateur"],
    "mood": ["psychologue"],
    "consent": ["social"],
}
CHILD_BLOCKS = tuple(BLOCK_EDITORS)
# l'humeur ne s'écrit que par une consultation (seule l'échelle « humeur » est partagée)
EDITABLE_BLOCKS = tuple(b for b in CHILD_BLOCKS if b != "mood")
AUDITED_BLOCKS = ("health", "legal")


def can_edit_block(role: str, block: str) -> bool:
    return is_professional(role) and role in BLOCK_EDITORS.get(block, [])


def can_edit_phase(role: str) -> bool:
    return is_professional(role)


def allowed_phase_targets(current: int) -> list[int]:
    """On avance d'une phase (1→2→3→4→5), ou 4→3 pour réajuster."""
    targets = []
    if current < 5:
        targets.append(current + 1)
    if current == 4:
        targets.append(3)
    return targets


ROADMAP_OWNERS = {"education": "educateur", "psychologique": "psychologue", "sociale": "social"}
ROADMAP_PART_KEYS = tuple(ROADMAP_OWNERS)
# chaque partie ne lit que les notes pour l'IA de son métier
PART_SOURCES = {"education": ["educateur"], "psychologique": ["psychologue"], "sociale": ["social"]}


def can_validate_roadmap_part(role: str, part: str) -> bool:
    return ROADMAP_OWNERS.get(part) == role


def can_request_roadmap_update(role: str) -> bool:
    return is_professional(role)


def can_edit_attendance(role: str) -> bool:
    return role == "educateur"


def can_read_attendance(role: str) -> bool:
    return is_professional(role)


def can_edit_activities(role: str) -> bool:
    return role == "educateur"


def can_read_activities(role: str) -> bool:
    return role in ("educateur", "psychologue")


def can_edit_aids(role: str) -> bool:
    return role == "social"


SESSION_KIND_BY_ROLE = {"psychologue": "consultation", "social": "visite", "educateur": "observation"}
SESSION_EDIT_WINDOW = timedelta(hours=24)


def can_edit_session(session) -> bool:
    """L'auteur corrige sa séance pendant 24 h ; elle ne se supprime jamais."""
    return timeutil.now() < session.created_at + SESSION_EDIT_WINDOW


def ai_threshold() -> int:
    return settings.AI_AUTO_UPDATE_THRESHOLD


def can_see_child(user, child) -> bool:
    if child.pole_id != user.pole_id:
        return False
    if user.role == "directeur":
        return True
    return child.assigned_id(user.role) == user.id
