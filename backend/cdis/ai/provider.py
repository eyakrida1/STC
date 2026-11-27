"""
Point de branchement de l'IA de la roadmap.

Le fournisseur est une fonction (réglage AI_PROVIDER, chemin pointé) :

    draft_part(part, current, notes, context) -> {"content": {...}, "changes": [...]} | None

- part     : "education" | "psychologique" | "sociale"
- current  : contenu de la partie (proposition en attente, sinon version validée) — forme RoadmapContentMap[part]
- notes    : notes « pour l'IA » non utilisées, DU MÉTIER de la partie : [{sessionId, authorRole, date, text}]
- context  : {"today": "AAAA-MM-JJ", "aids": [{"program": libellé, "status": statut}]}

Ce qui n'est JAMAIS transmis : nom, photo, CIN, adresse, notes privées, notes partagées, blocs Santé / Judiciaire.
La réponse est validée (forme du contrat, sources citées existantes) avant d'être enregistrée ; une réponse
invalide est ignorée et journalisée. La validation humaine reste obligatoire (chaque responsable valide sa partie).

Aujourd'hui : cdis.ai.simulator.draft_part (règles déterministes). Pour un vrai modèle, écrire une fonction de
même signature (appel côté serveur, idéalement hébergé par le centre — données de mineurs) et pointer
CDIS_AI_PROVIDER dessus.
"""
import logging

from django.conf import settings
from django.utils.module_loading import import_string

from ..http import ApiError
from ..validation import clean, clean_roadmap_content

log = logging.getLogger(__name__)

CHANGE_SCHEMA = {"field": "text", "summary": "text", "sourceSessionIds": ["text"]}


def get_provider():
    return import_string(settings.AI_PROVIDER)


def safe_draft(part: str, current: dict, notes: list[dict], context: dict) -> dict | None:
    """Appelle le fournisseur et valide sa réponse ; None si rien à proposer ou réponse invalide."""
    try:
        draft = get_provider()(part, current, notes, context)
    except Exception:  # un fournisseur défaillant ne doit pas casser l'enregistrement d'une séance
        log.exception("Fournisseur IA en échec (partie %s)", part)
        return None
    if not draft:
        return None
    try:
        content = clean_roadmap_content(part, draft.get("content"))
        changes = [clean(CHANGE_SCHEMA, c, "changes") for c in draft.get("changes") or []]
    except (ApiError, AttributeError):
        log.warning("Réponse IA invalide ignorée (partie %s)", part)
        return None
    known = {n["sessionId"] for n in notes}
    if not changes or any(not set(c["sourceSessionIds"]) <= known for c in changes):
        log.warning("Réponse IA sans source valide ignorée (partie %s)", part)
        return None
    return {"content": content, "changes": changes}
