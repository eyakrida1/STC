/**
 * Règles d'accès par rôle — source unique côté front.
 * La couche api/ les applique aussi (comme le fera le backend Django) : le front ne fait qu'adapter l'affichage.
 */
import type { ChildBlock, PhaseId, ProfessionalRole, Role, RoadmapPartKey } from "@/types"

export const ALL_ROLES: Role[] = ["educateur", "psychologue", "social", "directeur"]
export const PRO_ROLES: ProfessionalRole[] = ["educateur", "psychologue", "social"]

export function isProfessional(role: Role): role is ProfessionalRole {
  return role !== "directeur"
}

/** Page d'arrivée après connexion. */
export function homePathFor(role: Role): string {
  return role === "directeur" ? "/tableau-de-bord" : "/enfants"
}

/** Routes protégées : qui peut ouvrir quoi. */
export const ROUTE_ROLES = {
  children: PRO_ROLES, // /enfants — Mes enfants (seulement les enfants assignés)
  childFile: ALL_ROLES, // /enfants/:id — partie commune (directeur : lecture seule)
  roadmap: ALL_ROLES, // /enfants/:id/roadmap (directeur : lecture seule)
  workspace: PRO_ROLES, // espaces propres (séances, notes reçues…)
  dashboard: ["directeur"] as Role[], // /tableau-de-bord
  profile: ALL_ROLES, // /profil
} satisfies Record<string, Role[]>

/** Propriétaire(s) de chaque bloc de la partie commune : eux seuls le modifient, les autres le lisent. */
export const BLOCK_EDITORS: Record<ChildBlock, ProfessionalRole[]> = {
  identity: ["social"],
  journey: ["social"], // la phase elle-même : toute l'équipe (voir canEditPhase)
  family: ["social"],
  economic: ["social"],
  schooling: ["educateur"],
  health: ["social", "psychologue"],
  legal: ["social", "psychologue"],
  interests: ["educateur"],
  mood: ["psychologue"],
  consent: ["social"],
}

/** Blocs repliés par défaut, dont l'ouverture est tracée dans le journal d'audit. */
export const AUDITED_BLOCKS: ChildBlock[] = ["health", "legal"]

export function canEditBlock(role: Role, block: ChildBlock): boolean {
  return isProfessional(role) && BLOCK_EDITORS[block].includes(role)
}

export function canEditPhase(role: Role): boolean {
  return isProfessional(role)
}

/** Passages de phase autorisés : on avance d'une phase (1→2→3→4→5), ou 4→3 pour réajuster. */
export function allowedPhaseTargets(current: PhaseId): PhaseId[] {
  const targets: PhaseId[] = []
  if (current < 5) targets.push((current + 1) as PhaseId)
  if (current === 4) targets.push(3)
  return targets
}

/** Responsable de validation de chaque partie de la roadmap. */
export const ROADMAP_OWNERS: Record<RoadmapPartKey, ProfessionalRole> = {
  education: "educateur",
  psychologique: "psychologue",
  sociale: "social",
}

export function canValidateRoadmapPart(role: Role, part: RoadmapPartKey): boolean {
  return ROADMAP_OWNERS[part] === role
}

/** Tout intervenant peut demander une mise à jour IA et commenter une proposition ; le directeur non. */
export function canRequestRoadmapUpdate(role: Role): boolean {
  return isProfessional(role)
}

/** Le directeur ne lit jamais le contenu des séances (ni privé, ni partagé, ni IA). */
export function canReadSessions(role: Role): boolean {
  return isProfessional(role)
}

/** Présence : saisie par l'éducateur, consultée par le psy et le social. */
export function canEditAttendance(role: Role): boolean {
  return role === "educateur"
}

/** Planning d'activités : éditable par l'éducateur, lu par le psy. */
export function canEditActivities(role: Role): boolean {
  return role === "educateur"
}

/** Aides de l'État : gérées par l'intervenant social ; statut visible par toute l'équipe. */
export function canEditAids(role: Role): boolean {
  return role === "social"
}

/** Une note se corrige pendant 24 h par son auteur ; elle ne se supprime jamais. */
export const SESSION_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

/** Temps restant (ms) pour corriger une séance ; 0 si le délai de 24 h est passé. */
export function sessionEditRemainingMs(session: { createdAt: string }, now = Date.now()): number {
  return Math.max(0, new Date(session.createdAt).getTime() + SESSION_EDIT_WINDOW_MS - now)
}

/** L'auteur peut corriger sa séance pendant 24 h (l'api vérifie aussi qu'il est l'auteur). */
export function canEditSession(session: { createdAt: string }, now = Date.now()): boolean {
  return sessionEditRemainingMs(session, now) > 0
}

/** Déconnexion automatique (postes partagés). */
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000

/** Seuil de nouvelles notes pour l'IA déclenchant une proposition automatique (réglage du centre). */
export const AI_AUTO_UPDATE_THRESHOLD = 5
