"""
Socle HTTP de l'API : erreurs au format du contrat, lecture du JSON, utilisateur et enfant requis.

Toute erreur renvoie { "error": <code>, "message": <détail> } avec le statut :
  unauthorized 401 · forbidden 403 · not_found 404 · invalid 400 · conflict 409
Le front la transforme en ApiError(code, message).
"""
import functools
import json
import logging

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.http import HttpRequest, JsonResponse

from .access import can_see_child
from .models import Child

log = logging.getLogger(__name__)

STATUS = {"unauthorized": 401, "forbidden": 403, "not_found": 404, "invalid": 400, "conflict": 409}


class ApiError(Exception):
    def __init__(self, code: str, message: str | None = None):
        super().__init__(message or code)
        self.code = code
        self.message = message or code


def ok(data=None, status: int = 200) -> JsonResponse:
    """Réponse JSON. `None` → null (fonctions qui ne renvoient rien côté front)."""
    return JsonResponse(data, status=status, safe=False, json_dumps_params={"ensure_ascii": False})


def error_response(code: str, message: str | None = None) -> JsonResponse:
    return JsonResponse({"error": code, "message": message or code}, status=STATUS.get(code, 400))


def body(request: HttpRequest) -> dict:
    if not request.body:
        return {}
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ApiError("invalid", "bad_json") from exc
    if not isinstance(data, dict):
        raise ApiError("invalid", "bad_json")
    return data


def endpoint(*methods: str, auth: bool = True):
    """
    Décorateur de vue : méthodes HTTP autorisées, authentification, transaction, erreurs → JSON.
    La vue reçoit `request` (avec `request.user` connecté si auth=True) et renvoie une valeur sérialisable.
    """

    def decorator(view):
        @functools.wraps(view)
        def wrapper(request: HttpRequest, *args, **kwargs):
            if request.method not in methods:
                return JsonResponse({"error": "invalid", "message": "method_not_allowed"}, status=405)
            try:
                if auth and not request.user.is_authenticated:
                    raise ApiError("unauthorized")
                with transaction.atomic():
                    result = view(request, *args, **kwargs)
                return result if isinstance(result, JsonResponse) else ok(result)
            except ApiError as exc:
                return error_response(exc.code, exc.message)
            except PermissionDenied as exc:
                return error_response("forbidden", str(exc) or None)

        return wrapper

    return decorator


def require_child(user, child_id: str) -> Child:
    """Enfant visible par l'utilisateur (même pôle ; intervenant : assigné), sinon not_found / forbidden."""
    # verrou de ligne (PostgreSQL) : les vues tournent dans une transaction ; sans effet sous SQLite
    child = Child.objects.select_for_update(of=("self",)).filter(pk=child_id).first()
    if child is None:
        raise ApiError("not_found")
    if not can_see_child(user, child):
        raise ApiError("forbidden")
    return child


def require_professional(user):
    if not user.is_professional:
        raise ApiError("forbidden")


def text(value) -> str | None:
    """Texte nettoyé, ou None si vide (équivalent de clean() côté front)."""
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None
