"""
Réglages Django du backend CDIS.
Variables d'environnement (toutes facultatives en développement) :
  CDIS_SECRET_KEY, CDIS_DEBUG (1/0), CDIS_ALLOWED_HOSTS (liste séparée par des virgules),
  CDIS_DB_PATH (fichier SQLite), CDIS_DEMO_MODE (1/0 : comptes de démo + réinitialisation),
  CDIS_CSRF_TRUSTED_ORIGINS (origines du front, ex. https://cdis.example.tn).
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name: str, default: bool) -> bool:
    return os.environ.get(name, "1" if default else "0").strip().lower() in ("1", "true", "yes", "on")


DEBUG = env_bool("CDIS_DEBUG", True)
SECRET_KEY = os.environ.get("CDIS_SECRET_KEY") or (
    "dev-only-insecure-key-change-me" if DEBUG else None
)
if not SECRET_KEY:
    raise RuntimeError("CDIS_SECRET_KEY est obligatoire quand CDIS_DEBUG=0")

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("CDIS_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]
CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CDIS_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

# Démo : comptes affichés sur /connexion et bouton « Réinitialiser la démo ». À couper en production.
DEMO_MODE = env_bool("CDIS_DEMO_MODE", True)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "cdis",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("CDIS_DB_PATH", str(BASE_DIR / "db.sqlite3")),
    }
}

AUTH_USER_MODEL = "cdis.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Tunis"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Session = cookie HttpOnly. Postes partagés : expiration après 30 min d'inactivité (prolongée à chaque requête).
SESSION_COOKIE_AGE = 30 * 60
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# Photo de profil envoyée en data URL (image réduite par le front) : on borne la taille des requêtes.
DATA_UPLOAD_MAX_MEMORY_SIZE = 3 * 1024 * 1024

# Seuil de notes pour l'IA déclenchant une proposition automatique (réglage du centre).
AI_AUTO_UPDATE_THRESHOLD = int(os.environ.get("CDIS_AI_THRESHOLD", "5"))
# Fournisseur de l'IA de la roadmap : chemin pointé vers une fonction (voir cdis/ai/provider.py).
AI_PROVIDER = os.environ.get("CDIS_AI_PROVIDER", "cdis.ai.simulator.draft_part")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    # les 4xx sont des refus métier attendus (droits, validation) : on ne journalise que les erreurs serveur
    "loggers": {"django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False}},
}
