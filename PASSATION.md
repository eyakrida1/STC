# Passation — CDIS « Dossier enfant » (POC front)

Document à donner à une nouvelle discussion avec une IA pour reprendre le projet sans perdre le contexte.

## À partager dans la nouvelle discussion

1. **Ce fichier** (`PASSATION.md`) : l'historique, les décisions, ce qui reste à faire.
2. **`CLAUDE.md`** (racine) : les règles du projet (stack, design tokens, règles de style, droits par rôle,
   architecture, routes). C'est la référence obligatoire : toute modification doit le respecter.
3. **`CDIS — POC description des interfaces.docx`** (racine) : le cahier des charges fonctionnel d'origine.
4. Le dépôt lui-même (dossier `frontend/`) si l'outil peut lire les fichiers ; sinon, au minimum :
   - `frontend/src/types/domain.ts` (modèle de données = contrat de la future API Django) ;
   - `frontend/src/lib/access.ts` (droits par rôle) ;
   - `backend/cdis/seed/donnees.py` (toutes les données de démo) ;
   - `frontend/src/api/` (appels HTTP au backend) et `backend/cdis/ai/` (simulateur d'IA et point de branchement) ;
   - `frontend/src/i18n/fr.ts` (tous les textes d'interface).

### Message de départ suggéré

> Tu reprends le POC front « CDIS — Dossier enfant » (React + Vite + TypeScript dans `frontend/`).
> Lis d'abord `CLAUDE.md` (règles obligatoires) et `PASSATION.md` (historique et suite), puis le .docx du cahier
> des charges. Réponds en français. Ne change rien avant de m'avoir proposé un plan. Lance `npm run lint` et
> `npm run build` (dans `frontend/`) avant de rendre une étape, et vérifie dans le navigateur avec les comptes
> de démo (mot de passe `demo`) : `educateur`, `psy`, `social`, `directeur`.

## Le projet en bref

Application pour les Centres de Défense et d'Inclusion Sociale (Tunisie). Trois intervenants (éducateur,
psychologue, intervenant social) suivent chaque enfant, enregistrent des **séances à 3 sorties** (note privée,
note partagée, note pour l'IA). Une **IA** propose une **roadmap** commune ; chaque responsable valide sa partie
(éducation / psychologique / sociale). Un **directeur** pilote avec un tableau de bord. Données FICTIVES.

Démarrer : backend (`backend/README.md` : venv, `migrate`, `seed_demo`, `runserver`) puis `cd frontend && npm install && npm run dev`.

### Rôles

| Rôle | Fait | Valide |
|---|---|---|
| Éducateur | observations, planning d'activités, présence, blocs Scolarité et Intérêts | partie Éducation |
| Psychologue | consultations + 6 échelles (seule l'humeur générale est partagée), courbe d'humeur, Santé / Judiciaire | partie Psychologique |
| Intervenant social | visites familiales, aides de l'État, blocs administratifs (identité, famille, économie…) | partie Sociale |
| Directeur | tableau de bord, alertes, journal des accès sensibles ; dossier et roadmap en lecture seule, jamais le contenu des séances | — |

### Mécanisme de l'IA (aujourd'hui SIMULÉE)

- Source : uniquement la zone **« Pour l'IA »** des séances (jamais les notes privées ni partagées), plus la roadmap
  validée et le statut des aides. Jamais : nom, photo, CIN, adresse, Santé, Judiciaire.
- Chaque partie ne lit que les notes de son métier (éducation ← éducateur, psychologique ← psy, sociale ← social).
- Déclenchement : bouton « Mettre à jour la roadmap » ou automatiquement à 5 notes pour l'IA non utilisées.
- Chaque changement cite ses notes sources ; le responsable valide / modifie (justification) / rejette (justification).
- Implémentation : `backend/cdis/ai/simulator.py` (règles par mots-clés, déterministe). Point de branchement du
  futur vrai modèle : `backend/cdis/ai/provider.py` (réglage `CDIS_AI_PROVIDER`).

## Historique (commits sur la branche `master`, rien n'est poussé)

| Commit | Contenu |
|---|---|
| `07d5946` | socle : tokens, i18n, RTL, données fictives + couche `api/`, auth simulée, composants, `/styleguide`, CLAUDE.md |
| `1d67084` | connexion + Mes enfants |
| `f02ac09` | dossier enfant : avatar vivant, changement de phase, 9 blocs éditables selon le rôle |
| `e09a163` | Mon espace (séances à 3 sorties) + Notes reçues |
| `c0a1d97` | Roadmap dessinée + propositions IA + validation + historique |
| `3299e1d` | sous-sections Mon espace (activités, présence, humeur, aides) + Mon profil |
| `1c7aa69` | tableau de bord du directeur |
| `7c0ccb5` | journal des accès sensibles (directeur) |
| `ba35053` | toutes les données de démo regroupées dans `frontend/src/mocks/donnees.ts` |
| (suivant) | corrections de l'audit design et de cohérence (voir plus bas) |

## Décisions prises

- Formulaires de séance en panneau latéral large ; édition des blocs du dossier en panneau latéral.
- « Pop » (couleurs vives, animations) réservée à l'avatar et à la roadmap ; exceptions documentées dans CLAUDE.md.
- Aucune donnée écrite à la main dans un écran : tout vient de `backend/cdis/seed/donnees.py` via `api/`.
- Le journal des accès sensibles n'est lisible que par le directeur.
- Notes pour l'IA : chaque partie ne lit que les notes de son métier (option A).
- « Consentement » = consentement du tuteur au **traitement des données** (renommé en ce sens).

## Corrections de l'audit (dernier lot)

Faites :
- En-tête de page empilé sur mobile (titre puis actions) ; contraste du texte secondaire relevé (`ink-muted` #5f6673).
- Route de la roadmap : panneaux franchis en fond doux + texte foncé (lisibles), fanions qui ne chevauchent plus
  les panneaux ni l'avatar.
- Avatar de l'enfant : l'expression (bouche, sourcils) suit l'humeur 1 → 5 partout (cartes, dossier, roadmap).
- « Réinitialiser la démo » déplacé du menu utilisateur vers l'encart des comptes de démo de `/connexion`.
- Textes : « Direction » pour le rôle du directeur ; « Consentement au traitement des données » ; « Visites » pour
  le social ; libellés de la zone partagée et des validations en attente clarifiés ; « Humeur : … » sur les cartes.
- IA : chaque partie ne lit que les notes de son métier (option A) ; le diff place chaque retrait juste avant son
  remplacement.
- Roadmap : la partie Éducation montre le niveau scolaire réel en direct, la partie Sociale le statut des aides
  en direct (au lieu de valeurs figées dans la proposition).
- États d'erreur avec « Réessayer » (activités, présence, humeur) ; chargement dans les notifications ;
  pied des dialogues blanc avec bordure ; chiffres clés du tableau de bord sur 2 colonnes en mobile.

Non faites (à reprendre) :
- Hauteur de l'en-tête du dossier et de la route verticale sur mobile (beaucoup de défilement).
- Doublon « Observations » entre l'onglet Mon espace et son premier segment.
- Contenu des propositions du simulateur parfois peu crédible (règles par mots-clés).

## Ce qui reste à faire

### Front (POC)
- Décision d'admission dans le bloc Parcours (qui a validé l'entrée, quand, sur quelle base : décision du juge,
  signalement…) — à confirmer avec l'équipe.
- Consentement à l'usage de la photo (tuteur, enfant, les deux ?) — question ouverte du cahier des charges.
- Écran d'administration (comptes, affectation des enfants, seuil de mise à jour IA).
- Version arabe (structure prête : propriétés logiques, `dir` à la racine ; il reste `ar.ts`).
- Réduire la taille du bundle (≈ 1,4 Mo, surtout DiceBear) par découpage.
- Cas non testés en navigateur : modification d'une activité existante, inscription à un nouveau programme d'aide,
  rejet d'une proposition IA, validation de la partie sociale.

### Produit
- **Vraie IA** : choisir où elle tourne (serveur du centre ou service externe — confidentialité de données de
  mineurs) ; appel côté serveur avec données anonymisées ; réponse JSON structurée (même format que la simulation)
  validée avant affichage ; validation humaine maintenue.
- ~~Backend Django~~ : **fait** (`backend/`, voir `backend/README.md`) — API JSON, permissions par rôle côté serveur,
  sessions + CSRF, journal d'audit en ajout seul, validation du contrat, 31 tests ; `frontend/src/api/` appelle l'API
  en HTTP avec les mêmes signatures. Reste : PostgreSQL et déploiement, écran d'administration dans l'app (aujourd'hui `/admin/` Django).
- **Avatar à partir de la photo** généré sur le serveur du centre (la photo ne sort jamais).
- Dépôt : la branche principale attendue est `main`, le travail est sur `master` ; rien n'a été poussé.
