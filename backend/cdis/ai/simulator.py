"""
IA SIMULÉE (déterministe) — port fidèle de frontend/src/api/aiSimulator.ts.
On lit des mots-clés dans les notes pour l'IA, on propose quelques ajouts / retraits, et chaque changement cite
la note qui le justifie. Voir cdis/ai/provider.py pour brancher un vrai modèle.
"""
import copy
import re
import unicodedata
from datetime import date, timedelta


def norm(s: str) -> str:
    decomposed = unicodedata.normalize("NFD", s)
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn").lower()


POSITIVE = re.compile(
    r"(a l'aise|progres|mieux|reussi|ponctuel|applique|motiv|hausse|en baisse|amelior|confian|positif|soutien|obtenu|accorde|investi)"
)
NEGATIVE = re.compile(r"(difficult|perd |fragile|tendu|echec|mal dor|inadapte|precaire|conflit)")

SKILL_WORDS = [
    (re.compile(r"lecture"), re.compile(r"(lecture|lire|notice)")),
    (re.compile(r"calcul"), re.compile(r"(calcul|proportion|math)")),
    (re.compile(r"ponctu"), re.compile(r"ponctu")),
    (re.compile(r"equipe"), re.compile(r"(equipe|camarade|groupe)")),
    (re.compile(r"patience"), re.compile(r"patien")),
]

AID_STATUS_TEXT = {"a_preparer": "à préparer", "depose": "déposée", "accorde": "accordée", "refuse": "refusée"}


def clause(text: str, index: int = 0) -> str | None:
    """Morceau de phrase n° index, propre et court."""
    parts = [p.strip() for p in re.split(r"[;.,]", text)]
    parts = [p for p in parts if p]
    if index >= len(parts):
        return None
    p = parts[index]
    c = p[0].upper() + p[1:]
    return f"{c[:87]}…" if len(c) > 90 else c


def lower_first(s: str) -> str:
    return s[:1].lower() + s[1:]


def _due(today: date, days: int) -> str:
    return (today + timedelta(days=days)).isoformat()


def draft_education(current: dict, notes: list[dict], today: date):
    c = copy.deepcopy(current)
    changes = []
    for s in notes:
        text = s["text"]
        n = norm(text)
        positive = bool(POSITIVE.search(n))
        # 1. jauges : une compétence citée positivement gagne un niveau
        for g in c["skillGauges"]:
            words = next((w for k, w in SKILL_WORDS if k.search(norm(g["skill"]))), None)
            if not words:
                continue
            m = words.search(n)
            if not m:
                continue
            i = m.start()
            window = n[max(0, i - 25) : i + 20]
            negative_here = bool(NEGATIVE.search(n)) and bool(re.search(r"perd|difficult", window))
            if positive and not negative_here and g["level"] < 5:
                changes.append(
                    {"field": "skillGauges", "summary": f"{g['skill']} : {g['level']} → {g['level'] + 1}", "sourceSessionIds": [s["sessionId"]]}
                )
                g["level"] += 1
        # 2. compétence acquise : le premier morceau d'une note positive
        first = clause(text)
        if positive and first and first not in c["acquiredSkills"]:
            c["acquiredSkills"] = [*c["acquiredSkills"], first]
            changes.append({"field": "acquiredSkills", "summary": first, "sourceSessionIds": [s["sessionId"]]})
        # 3. une difficulté citée devient un prochain pas
        second = clause(text, 1)
        if second and NEGATIVE.search(norm(second)):
            label = f"Accompagner : {lower_first(second)}"
            c["nextSteps"] = [*c["nextSteps"], {"label": label, "dueDate": _due(today, 30)}]
            changes.append({"field": "nextSteps", "summary": label, "sourceSessionIds": [s["sessionId"]]})
    # 4. un prochain pas dont l'échéance est passée est retiré
    t = today.isoformat()
    overdue = [x for x in c["nextSteps"] if x["dueDate"] < t]
    if overdue and changes:
        c["nextSteps"] = [x for x in c["nextSteps"] if x["dueDate"] >= t]
        for x in overdue:
            changes.append({"field": "nextSteps", "summary": f"Retiré : {x['label']}", "sourceSessionIds": changes[0]["sourceSessionIds"]})
    return {"content": c, "changes": changes} if changes else None


def draft_psychological(current: dict, notes: list[dict], today: date):
    c = copy.deepcopy(current)
    changes = []
    for s in notes:
        text = s["text"]
        n = norm(text)
        first = clause(text)
        if not first:
            continue
        sid = [s["sessionId"]]
        if POSITIVE.search(n) and s["authorRole"] == "psychologue" and first not in c["progress"]:
            c["progress"] = [*c["progress"], first]
            changes.append({"field": "progress", "summary": first, "sourceSessionIds": sid})
            # un axe de travail clairement amélioré est retiré
            solved = None
            for axis in c["toWork"]:
                key = norm(axis).split(" ")[0]
                if len(key) > 4 and key in n and re.search(r"(hausse|amelior|en baisse|mieux)", n):
                    solved = axis
                    break
            if solved:
                c["toWork"] = [a for a in c["toWork"] if a != solved]
                changes.append({"field": "toWork", "summary": f"Retiré : {solved}", "sourceSessionIds": sid})
        if NEGATIVE.search(n) and re.search(r"(colere|anxi|confian|patien|fatig|echec)", n):
            base = clause(text, 1) or first
            axis = base[:1].upper() + base[1:]
            if axis not in c["toWork"]:
                c["toWork"] = [*c["toWork"], axis]
                changes.append({"field": "toWork", "summary": axis, "sourceSessionIds": sid})
        if s["authorRole"] == "educateur" and POSITIVE.search(n):
            trait = "Habile de ses mains" if "manuel" in n else "Entraide avec les autres" if re.search(r"aide|camarade", n) else None
            if trait and trait not in c["character"]:
                c["character"] = [*c["character"], trait]
                changes.append({"field": "character", "summary": trait, "sourceSessionIds": sid})
    return {"content": c, "changes": changes} if changes else None


def draft_social(current: dict, notes: list[dict], aids: list[dict], today: date):
    c = copy.deepcopy(current)
    changes = []
    src = [s["sessionId"] for s in notes]
    # aides en cours : recalculées depuis le suivi réel des dossiers d'aide
    live = [f"{a['program']} : {AID_STATUS_TEXT[a['status']]}" for a in aids]
    added = [x for x in live if x not in c["aidsSummary"]]
    removed = [x for x in c["aidsSummary"] if x not in live]
    if (added or removed) and src:
        c["aidsSummary"] = live
        for x in removed:
            changes.append({"field": "aidsSummary", "summary": f"Retiré : {x}", "sourceSessionIds": src})
        for x in added:
            changes.append({"field": "aidsSummary", "summary": x, "sourceSessionIds": src})
    for s in notes:
        first = clause(s["text"])
        if not first:
            continue
        label = f"Faire le point avec la famille : {lower_first(first)}"
        if not any(x["label"] == label for x in c["nextSteps"]):
            c["nextSteps"] = [*c["nextSteps"], {"label": label, "dueDate": _due(today, 21)}]
            changes.append({"field": "nextSteps", "summary": label, "sourceSessionIds": [s["sessionId"]]})
    return {"content": c, "changes": changes} if changes else None


def draft_part(part: str, current: dict, notes: list[dict], context: dict):
    """Fournisseur par défaut (voir cdis/ai/provider.py)."""
    today = date.fromisoformat(context["today"])
    if part == "education":
        return draft_education(current, notes, today)
    if part == "psychologique":
        return draft_psychological(current, notes, today)
    if part == "sociale":
        return draft_social(current, notes, context.get("aids", []), today)
    return None
