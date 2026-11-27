# CDIS — backend Django

API JSON consommée par `frontend/src/api/` (préfixe `/api/`). Les types de `frontend/src/types/domain.ts`
sont le contrat ; les règles d'accès (`cdis/access.py`) font foi côté serveur.

## Démarrer

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Linux/macOS : .venv/bin/python
.venv/Scripts/python manage.py migrate
.venv/Scripts/python manage.py seed_demo                  # données FICTIVES, dates relatives à aujourd'hui
.venv/Scripts/python manage.py runserver 127.0.0.1:8000
```

Puis dans `frontend/` : `npm run dev` — Vite relaie `/api` vers `http://127.0.0.1:8000` (même origine : cookie de
session et CSRF). Comptes : `educateur`, `psy`, `social`, `directeur` (mot de passe `demo`).

Tests : `.venv/Scripts/python manage.py test cdis` (droits par rôle, confidentialité des 3 sorties, audit, IA).
Administration : `manage.py createsuperuser` puis `/admin/` (comptes, affectation des enfants, programmes d'aide).

## Organisation

| Fichier | Rôle |
|---|---|
| `cdis/models.py` | modèle de données (relationnel pour les droits et requêtes, JSON pour les blocs du dossier et la roadmap) |
| `cdis/access.py` | règles d'accès par rôle (port de `lib/access.ts`) |
| `cdis/validation.py` | validation de la forme des données entrantes selon le contrat |
| `cdis/http.py` | décorateur `endpoint` (méthodes, authentification, transaction, erreurs JSON) |
| `cdis/views/*.py` | une vue par fonction de `frontend/src/api/` (correspondance dans `cdis/urls.py`) |
| `cdis/services.py` | notifications, compteur des notes pour l'IA, génération des propositions |
| `cdis/ai/provider.py` | **point de branchement de l'IA** (données anonymisées en entrée, réponse validée) |
| `cdis/ai/simulator.py` | IA simulée déterministe (fournisseur par défaut) |
| `cdis/seed/` | données de démo (`donnees.py` = source unique) et chargement (`load_demo`) |

Erreurs : `{ "error": code, "message": détail }` — `unauthorized` 401, `forbidden` 403, `not_found` 404,
`invalid` 400, `conflict` 409.

## Sécurité

- Session Django (cookie HttpOnly, SameSite=Lax), expirée après 30 min sans requête ; CSRF obligatoire sur toute écriture.
- Mots de passe hachés (PBKDF2) ; 10 caractères minimum.
- Journal d'audit en ajout seul : l'ORM refuse modification et suppression ; lecture seule dans l'admin.
- Une séance ne se supprime jamais (`Session.delete` refusé).
- L'IA ne reçoit que les notes pour l'IA du métier de la partie, le contenu de roadmap et le statut des aides.

## Production (variables d'environnement)

| Variable | Par défaut | Production |
|---|---|---|
| `CDIS_DEBUG` | `1` | `0` (active aussi les cookies `Secure`) |
| `CDIS_SECRET_KEY` | clé de dev | **obligatoire** |
| `CDIS_ALLOWED_HOSTS` | `localhost,127.0.0.1` | nom du serveur |
| `CDIS_CSRF_TRUSTED_ORIGINS` | `http://localhost:5173,…` | origine du front |
| `CDIS_DEMO_MODE` | `1` | `0` (masque les comptes de démo et bloque `/api/demo/reset`) |
| `CDIS_DB_PATH` | `backend/db.sqlite3` | ou passer à PostgreSQL dans `config/settings.py` |
| `CDIS_AI_THRESHOLD` | `5` | seuil de mise à jour automatique |
| `CDIS_AI_PROVIDER` | `cdis.ai.simulator.draft_part` | fonction du vrai modèle |

Servir le front construit (`frontend/dist`) et l'API sous la même origine (reverse proxy : `/api/` → Django).
