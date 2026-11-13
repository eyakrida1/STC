# CDIS — Dossier enfant (POC)

Toute étape suivante doit respecter ce fichier. En cas de doute, la référence fonctionnelle est
`CDIS — POC description des interfaces.docx` (racine du dépôt).

## Contexte

Application pour les Centres de Défense et d'Inclusion Sociale (CDIS) en Tunisie, qui accueillent des enfants
en situation de vulnérabilité. Trois intervenants (éducateur, psychologue, intervenant social) suivent chaque enfant,
enregistrent des **séances à 3 sorties** (note privée, note partagée, note pour l'IA), et une IA propose des mises à jour
d'une **roadmap commune** que chaque responsable valide pour sa partie. Un directeur voit des statistiques.

Les utilisateurs sont des professionnels du social, peu technophiles, souvent sur des **postes partagés** :
l'interface doit être évidente au premier regard (peu d'éléments par écran, gros libellés, une action principale).

Flux démontré par le POC : séance → partage → roadmap IA (scénario « Yassine » dans le .docx).

## Stack

- `frontend/` : React 19 + Vite + TypeScript (strict), Tailwind CSS v4 (config dans le CSS via `@theme`),
  shadcn/ui (style base-nova, sur **Base UI** : on compose avec `render`, pas `asChild`), React Router (`react-router`),
  **Motion** (`import { motion } from "motion/react"` — jamais `framer-motion`), lucide-react, Recharts,
  police Rubik (`@fontsource/rubik`, latin + arabe), avatars DiceBear générés localement (`@dicebear/core` + `collection`).
- Backend futur : API Django (remplacera `src/api/`).

Commandes (dans `frontend/`) : `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`
(`lint` = oxlint + `scripts/check-logical.mjs`). Lancer `lint` et `build` avant de rendre une étape.

## Arborescence

```
frontend/src/
  api/            couche d'accès aux données (SEUL point d'entrée des pages) — async, 300 ms, localStorage
  mocks/          données FICTIVES (importées uniquement par api/)
  types/          modèle de données = contrat de la future API Django
  auth/           AuthProvider (session, inactivité 30 min), RequireAuth (routes par rôle)
  i18n/fr.ts      TOUS les textes visibles ; context.ts (useT / useI18n) ; I18nProvider pose lang + dir sur <html>
  lib/access.ts   règles d'accès par rôle (source unique côté front)
  lib/tokens.ts   correspondances valeur métier → classes Tailwind statiques (rôle, humeur, phase)
  lib/format.ts   dates (Intl), âge, noms
  lib/avatar.ts   avatars DiceBear locaux (enfant : adventurer ; intervenant : notionists)
  components/ui/  composants shadcn (générés, mode RTL) — modifier avec parcimonie
  components/cdis/ composants partagés CDIS
  components/shell/ coque (AppShell, Logo, NotificationsMenu, UserMenu)
  pages/          pages (aujourd'hui : Login, Profil, Styleguide, provisoires)
  styles/tokens.css design tokens (variables CSS)
```

## Design tokens

Définis dans `src/styles/tokens.css` (`--cdis-*`) et exposés à Tailwind dans `src/index.css`. Ne jamais coder une
couleur en dur dans un composant.

| Rôle | Valeur | Classe |
|---|---|---|
| Fond (sable) | #FAF7F2 | `bg-sand` / `bg-background` |
| Surface | #FFFFFF | `bg-surface` / `bg-card` |
| Bordure | #ECE6DC | `border-line` / `border-border` |
| Bordure de champ (3:1) | #9C9285 | `border-input` |
| Texte | #1F2A37 | `text-ink` |
| Texte secondaire | #6B7280 | `text-ink-muted` |
| Primaire (sarcelle) | #0F766E (doux #E6F2F1) | `bg-teal` / `bg-primary`, `bg-teal-soft` |
| Pop corail / soleil / ciel | #F97360 / #F5B700 / #38BDF8 | `bg-pop-coral`, `bg-pop-sun`, `bg-pop-sky` |
| Rôles | éducateur #D97706, psychologue #7C3AED, social #2563EB, directeur #0F766E | `bg-role-{educateur,psychologue,social,directeur}` |
| Humeur 1→5 | #EF4444, #F97316, #A3A3A3, #22C55E, #10B981 | `bg-mood-1` … `bg-mood-5` |
| Phases 1→5 | repère / fond doux / texte | `bg-phase-N`, `bg-phase-N-soft`, `text-phase-N-ink` |

Phases : 1 Inscription (bleu ardoise) · 2 Orientation et évaluation (ambre) · 3 Accompagnement multidisciplinaire
(lavande) · 4 Évaluation continue et ajustement (bleu-vert) · 5 Insertion (sauge).

Forme : rayon 12 px (`rounded-lg`, contrôles), cartes 16 px (`rounded-card`), ombres `shadow-card` / `shadow-raised`,
espacements multiples de 4, largeur max du contenu 1200 px (`max-w-page`), icônes lucide en trait 1,75 (global CSS).

## Règles de style

1. **La « pop » est RÉSERVÉE à l'avatar de l'enfant et à la roadmap.** Couleurs `pop-*`, animations Motion,
   illustrations : uniquement dans `ChildAvatar` et les écrans/composants de roadmap. Partout ailleurs : sobre
   (surface blanche, bordure fine, sarcelle pour l'action principale).
2. Couleurs de rôle et d'humeur = **pastilles et repères uniquement** (point, liseré, halo). Jamais en couleur de texte
   (contraste insuffisant) : le texte reste `text-ink` / `text-ink-muted`.
3. Classes Tailwind **statiques** : pas de `bg-mood-${n}` construit dynamiquement ; passer par `lib/tokens.ts`.
4. Peu d'éléments par écran, hiérarchie claire : un seul `h1` (via `PageHeader`), une action principale par écran.
5. Accessibilité : contraste AA minimum, focus visible (global), navigation clavier complète, libellés sur tous les
   champs, `aria-*` sur les icônes seules, cibles ≥ 40 px (boutons `h-10`, champs `h-11`).
6. `prefers-reduced-motion` respecté partout : `MotionConfig reducedMotion="user"` à la racine + règle CSS globale ;
   en plus, `useReducedMotion()` pour couper les boucles décoratives.
7. **Prêt pour l'arabe** : propriétés logiques uniquement (`ms/me`, `ps/pe`, `start/end`, `border-s/e`, `rounded-s/e`,
   `text-start/end`), flèches directionnelles avec `rtl:rotate-180`. Vérifié par `npm run lint`
   (`// logical-ok` pour une exception justifiée). `dir` est géré à la racine par `I18nProvider`.
8. **Aucun texte en dur** : tout passe par `src/i18n/fr.ts` (`const t = useT()`). Les libellés d'énumérations
   (rôles, phases, humeurs, statuts…) y sont typés `satisfies Record<…>`. Les données fictives peuvent contenir du texte.
9. Pas de thème sombre (les classes `dark:` de shadcn sont neutralisées).

## Composants partagés (`src/components/cdis/`, importer depuis `@/components/cdis`)

| Composant | Usage |
|---|---|
| `PageHeader` | h1 + description + actions ; `back` (lien retour), `leading` (avatar) |
| `SectionCard` | bloc d'information ; `editors` (« Modifié par » + rôles), `collapsible` + `onOpen` (audit Santé / Judiciaire), `notice` |
| `RoleBadge` | pastille de rôle (point coloré + libellé) ; `plain` sans fond |
| `PhaseBadge` | « 3 · Accompagnement » ; `variant="long"` libellé complet |
| `MoodBadge` | humeur 1–5 ; `showLabel={false}` = point seul |
| `StatCard` | chiffre clé ; `tone="attention"` |
| `EmptyState` | icône + phrase + action |
| `NoteCard` | note partagée reçue ; `unread` + `onOpen` (marque lue) |
| `UnreadDivider` | trait « Nouvelles » (`tone="new"`) / « Déjà lues » |
| `ChildAvatar` | avatar enfant (zone pop) : image ronde + halo couleur d'humeur ; `size` sm/md/lg/xl, `sex`. Version simple, à enrichir (expression selon l'humeur, accessoires, bulles d'intérêts) |
| `UserAvatar` | photo d'un intervenant (sobre) |
| `FullPageLoader` | chargement plein écran |

`/styleguide` (public) montre tous les tokens et composants, avec bascule LTR/RTL. **Tout nouveau composant partagé
doit y être ajouté.**

## Données : règle « pages → api/ uniquement »

- Les pages et composants importent `@/api` (ou `* as api from "@/api"`), **jamais** `@/mocks` (règle oxlint
  `no-restricted-imports`). Seul `src/api/` lit `src/mocks/`.
- Fonctions async avec latence simulée de 300 ms (`simulate()`), état persisté dans localStorage (`cdis.demo.db`),
  session simulée (`cdis.demo.session`), `resetDemo()` (aussi dans le menu utilisateur).
- Les contrôles d'accès sont faits **dans api/** (comme le fera Django) ; l'UI ne fait qu'adapter l'affichage
  avec `lib/access.ts`. Erreurs : `ApiError` (`unauthorized`, `forbidden`, `not_found`, `invalid`, `conflict`).
- Les types de `src/types/domain.ts` sont le contrat de l'API : les faire évoluer en connaissance de cause.
- Toujours afficher un état de chargement et un `EmptyState` quand une liste est vide.
- Les données sont FICTIVES. 4 comptes (mot de passe `demo`) : `educateur` (Karim Mansouri), `psy` (Leila Haddad),
  `social` (Sami Ayari), `directeur` (Mouna Khelifi), pôle CDIS Tunis. 6 enfants : Yassine (phase 3, scénario de démo),
  Amira (1), Hamza (2, absences), Rania (2, revenue au centre), Nour (4, proposition IA en attente — éducation),
  Skander (5). Proposition psy en attente depuis > 7 jours pour Hamza.

## Règles d'accès par rôle (`src/lib/access.ts`)

- **Connexion** : identifiant + mot de passe, message d'erreur générique, pas d'inscription.
  Déconnexion automatique après **30 min d'inactivité** (partagée entre onglets, vérifiée aussi au rechargement).
- **Arrivée** : intervenants → `/enfants` (Mes enfants) ; directeur → `/direction` (tableau de bord).
- **Intervenants** (éducateur, psychologue, social) : uniquement les enfants qui leur sont **assignés**.
  - Séances : chacun lit et écrit **ses** séances (psy : consultation, social : visite familiale, éducateur : observation).
    Note privée = l'auteur seul ; note partagée = destinataires cochés (état lu **par destinataire**) ;
    note pour l'IA = personne d'autre. Correction par l'auteur pendant 24 h, jamais de suppression.
  - Partie commune : chaque bloc a un propriétaire qui le modifie, les autres lisent
    (identité, parcours, famille, économie, consentement : social ; scolarité, intérêts : éducateur ;
    santé, judiciaire : social + psy ; humeur : psy ; la phase : toute l'équipe). Santé et Judiciaire sont repliés
    et leur ouverture est tracée (`logBlockOpened`).
  - Roadmap : tous lisent, demandent une mise à jour et commentent ; seul le responsable valide / modifie / rejette
    sa partie (éducation : éducateur, psychologique : psy, sociale : social), avec justification s'il modifie ou rejette.
    Mise à jour IA automatique après 5 nouvelles notes pour l'IA.
  - Présence : saisie par l'éducateur, lue par psy et social. Planning d'activités : éducateur, lu par le psy.
    Échelles d'humeur : psy seul (seule l'humeur générale est partagée et anime l'avatar).
    Aides de l'État : gérées par le social, statut visible par l'équipe.
- **Directeur** : tableau de bord de son pôle (agrégats uniquement, humeur moyenne jamais par enfant) ;
  partie commune et roadmap en **lecture seule** ; **jamais** le contenu des séances (ni privé, ni partagé, ni IA).
- L'IA ne reçoit jamais : nom, photo, CIN, adresse, notes privées, notes partagées, blocs Santé / Judiciaire.

## Routes

| Route | Accès | État |
|---|---|---|
| `/login` | public | fait |
| `/styleguide` | public | fait |
| `/` | connecté | redirige selon le rôle |
| `/enfants` | intervenants | provisoire |
| `/enfants/:childId/*` | intervenants assignés + directeur (lecture) | provisoire |
| `/direction` | directeur | provisoire |
| `/profil` | tous | version simple (lecture) |
