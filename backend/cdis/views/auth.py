"""Connexion, session, profil, équipe du pôle, démo (équivalent de frontend/src/api/auth.ts)."""
from django.conf import settings
from django.contrib.auth import authenticate, login as django_login, logout as django_logout, update_session_auth_hash
from django.views.decorators.csrf import ensure_csrf_cookie

from .. import serializers as ser
from .. import timeutil
from ..http import ApiError, body, endpoint
from ..models import User
from ..validation import clean

MAX_PHOTO_CHARS = 2_000_000  # data URL d'une image déjà réduite par le front


@ensure_csrf_cookie
@endpoint("GET", auth=False)
def csrf(request):
    """Pose le cookie CSRF (à appeler avant le premier POST)."""
    return None


@endpoint("POST", auth=False)
def login(request):
    """Message d'erreur volontairement générique (ne dit pas quel champ est faux)."""
    data = body(request)
    username = str(data.get("username", "")).strip().lower()
    password = str(data.get("password", ""))
    user = authenticate(request, username=username, password=password) if username and password else None
    if user is None or not user.is_active:
        raise ApiError("unauthorized")
    django_login(request, user)
    return ser.user(user)


@endpoint("POST", auth=False)
def logout(request):
    django_logout(request)
    return None


@ensure_csrf_cookie
@endpoint("GET", auth=False)
def me(request):
    """Utilisateur de la session en cours, ou null."""
    return ser.user(request.user) if request.user.is_authenticated else None


@endpoint("PUT")
def update_profile(request):
    """Seuls photo, nom, prénom, date de naissance, téléphone et e-mail sont modifiables (pas CIN, rôle, pôle)."""
    data = clean(
        {"firstName": "text", "lastName": "text", "birthDate": "str", "phone": "str", "email": "str", "photoUrl": "str?"},
        body(request),
    )
    birth = timeutil.parse_date(data["birthDate"]) if data["birthDate"] else None
    if data["birthDate"] and (birth is None or birth > timeutil.today()):
        raise ApiError("invalid", "birthDate")
    photo = data["photoUrl"]
    if photo is not None and (not photo.startswith("data:image/") or len(photo) > MAX_PHOTO_CHARS):
        raise ApiError("invalid", "photoUrl")
    me_ = User.objects.select_for_update().get(pk=request.user.pk)
    me_.first_name = data["firstName"].strip()
    me_.last_name = data["lastName"].strip()
    me_.birth_date = birth
    me_.phone = data["phone"].strip()
    me_.email = data["email"].strip()
    me_.photo_url = photo
    me_.save()
    me_.refresh_from_db()
    return ser.user(me_)


@endpoint("POST")
def change_password(request):
    data = body(request)
    old, new = str(data.get("oldPassword", "")), str(data.get("newPassword", ""))
    user = request.user
    if not user.check_password(old):
        raise ApiError("invalid", "wrong_password")
    if len(new) < 10:  # 10 caractères minimum
        raise ApiError("invalid", "too_short")
    user.set_password(new)
    user.save(update_fields=["password"])
    update_session_auth_hash(request, user)  # reste connecté
    return None


@endpoint("GET")
def team(request):
    """Équipe du pôle (noms, rôles, photos) — sans données sensibles."""
    users = User.objects.filter(pole_id=request.user.pole_id, is_active=True).order_by("id")
    return [ser.team_member(u) for u in users]


@endpoint("GET")
def my_pole(request):
    if request.user.pole is None:
        raise ApiError("not_found")
    return ser.pole(request.user.pole)


# ───────────────────────────── Démo (CDIS_DEMO_MODE=1 uniquement)
@endpoint("GET", auth=False)
def demo_accounts(request):
    """Comptes de démonstration affichés sur la page de connexion. Vide hors mode démo."""
    if not settings.DEMO_MODE:
        return []
    from ..seed.donnees import CREDENTIALS

    users = {u.username: u for u in User.objects.filter(username__in=CREDENTIALS)}
    return [
        {"username": name, "role": users[name].role, "password": pwd}
        for name, pwd in CREDENTIALS.items()
        if name in users
    ]


@endpoint("POST", auth=False)
def demo_reset(request):
    """Remet toutes les données de démonstration à zéro (refusé hors mode démo)."""
    if not settings.DEMO_MODE:
        raise ApiError("forbidden")
    from ..seed import load_demo

    load_demo()
    return None


