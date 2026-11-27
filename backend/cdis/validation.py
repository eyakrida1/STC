"""
Validation des données entrantes selon le contrat (domain.ts).
Un schéma décrit la forme attendue ; `clean(schema, value)` renvoie une copie ne contenant que les clés connues,
ou lève ApiError("invalid", "<chemin>") en indiquant le champ fautif.

Notation : "str" · "str?" (str ou null) · "text" (str non vide) · "bool" · "int" · "num" · "date" · "date?"
           ("enum", valeurs) · ("enum?", valeurs) · ("range", min, max) · ("range?", min, max)
           [schéma] = liste · {clé: schéma} = objet (clé finissant par « ? » = facultative)
"""
from .http import ApiError
from .timeutil import parse_date

SEX = ("M", "F")
MOOD = ("range", 1, 5)

PARENT = {"fullName": "str", "alive": "bool", "profession": "str", "phone": "str?"}
CONTACT = {"fullName": "str", "relation": "str", "phone": "str"}
NEXT_STEP = {"label": "text", "dueDate": "date"}

BLOCK_SCHEMAS = {
    "identity": {
        "firstName": "text",
        "lastName": "text",
        "birthDate": "date",
        "sex": ("enum", SEX),
        "gouvernorat": "str",
        "address": "str",
        "language": "str",
        "avatarSeed": "text",
        "avatarUrl?": "str?",
    },
    "family": {
        "father": PARENT,
        "mother": PARENT,
        "guardian": CONTACT,
        "siblings": [{"firstName": "str", "age": ("range", 0, 120), "sex": ("enum", SEX)}],
        "emergencyContact": CONTACT,
    },
    "economic": {
        "monthlyIncomeTnd": "num",
        "housing": ("enum", ("proprietaire", "locataire", "heberge", "precaire")),
        "householdSize": ("range", 1, 50),
    },
    "schooling": {
        "lastSchool": "str",
        "nominalGrade": ("range?", 1, 13),
        "actualGrade": ("range?", 1, 13),
        "subjects": [{"subject": "str", "nominal": "str", "actual": "str"}],
    },
    "health": {
        "bloodGroup": "str",
        "allergies": ["str"],
        "chronicConditions": ["str"],
        "treatments": ["str"],
        "disability": "str?",
        "vaccinationUpToDate": "bool",
        "doctor": "str",
    },
    "legal": {
        "hasMeasure": "bool",
        "measures": [
            {
                "type": "str",
                "authority": "str",
                "startDate": "date",
                "endDate": "date?",
                "center": "str?",
                "ongoingFollowUp": "bool",
            }
        ],
    },
    "interests": {"hobbies": ["str"], "interests": ["str"], "skillsToDevelop": ["str"], "wishes": "str"},
    "consent": {"given": "bool", "by": "str", "date": "date?"},
    # journey : seuls la date d'entrée du séjour en cours et l'orienteur sont modifiables (voir views/children.py)
    "journey": {
        "entryDate": "date",
        "referredBy": ("enum", ("delegue_protection", "famille", "ecole", "juge", "association", "autre")),
    },
}

SCALES = {k: MOOD for k in ("humeur", "anxiete", "confiance", "colere", "relations", "motivation")}

SESSION_DETAILS = {
    "consultation": {
        "kind": ("enum", ("consultation",)),
        "durationMin": ("range", 1, 24 * 60),
        "type": ("enum", ("initiale", "suivi", "crise")),
        "scales": SCALES,
    },
    "visite": {
        "kind": ("enum", ("visite",)),
        "location": ("enum", ("domicile", "centre", "autre")),
        "peopleMet": ["str"],
        "livingConditions": "str",
    },
    "observation": {
        "kind": ("enum", ("observation",)),
        "context": "str",
        "durationMin": ("range?", 1, 24 * 60),
        "skillsObserved": ["str"],
    },
}

ROADMAP_CONTENT = {
    "education": {
        "levelAtEntry": "str",
        "levelNow": "str",
        "acquiredSkills": ["str"],
        "milestones": [{"date": "date", "label": "str"}],
        "currentActivities": ["str"],
        "skillGauges": [{"skill": "str", "level": MOOD}],
        "nextSteps": [NEXT_STEP],
        "careerTracks": [{"title": "str", "reason": "str"}],
    },
    "psychologique": {
        "profile": "str",
        "character": ["str"],
        "progress": ["str"],
        "toWork": ["str"],
        "nextSteps": [NEXT_STEP],
    },
    "sociale": {"familySummary": "str", "aidsSummary": ["str"], "nextSteps": [NEXT_STEP]},
}

MAX_TEXT = 20_000


def _fail(path: str):
    raise ApiError("invalid", path or "value")


def clean(schema, value, path: str = ""):
    if isinstance(schema, dict):
        if not isinstance(value, dict):
            _fail(path)
        out = {}
        for raw_key, sub in schema.items():
            optional = raw_key.endswith("?")
            key = raw_key.rstrip("?")
            if key not in value:
                if optional:
                    continue
                _fail(f"{path}.{key}".lstrip("."))
            out[key] = clean(sub, value[key], f"{path}.{key}".lstrip("."))
        return out
    if isinstance(schema, list):
        if not isinstance(value, list) or len(value) > 500:
            _fail(path)
        return [clean(schema[0], v, f"{path}[{i}]") for i, v in enumerate(value)]
    if isinstance(schema, tuple):
        kind = schema[0]
        if value is None and kind.endswith("?"):
            return None
        if kind.startswith("enum"):
            if value not in schema[1]:
                _fail(path)
            return value
        if kind.startswith("range"):
            if isinstance(value, bool) or not isinstance(value, int) or not schema[1] <= value <= schema[2]:
                _fail(path)
            return value
    if schema in ("str", "str?", "text"):
        if value is None and schema == "str?":
            return None
        if not isinstance(value, str) or len(value) > MAX_TEXT:
            _fail(path)
        if schema == "text" and not value.strip():
            _fail(path)
        return value
    if schema == "bool":
        if not isinstance(value, bool):
            _fail(path)
        return value
    if schema in ("int", "num"):
        ok_type = isinstance(value, int) if schema == "int" else isinstance(value, (int, float))
        if isinstance(value, bool) or not ok_type or value < 0:
            _fail(path)
        return value
    if schema in ("date", "date?"):
        if value is None and schema == "date?":
            return None
        if parse_date(value) is None or len(value) != 10:
            _fail(path)
        return value
    raise AssertionError(f"schéma inconnu : {schema!r}")


def clean_block(block: str, value):
    return clean(BLOCK_SCHEMAS[block], value, block)


def clean_session_details(value) -> dict:
    if not isinstance(value, dict) or value.get("kind") not in SESSION_DETAILS:
        _fail("details.kind")
    return clean(SESSION_DETAILS[value["kind"]], value, "details")


def clean_roadmap_content(part: str, value) -> dict:
    return clean(ROADMAP_CONTENT[part], value, "content")
