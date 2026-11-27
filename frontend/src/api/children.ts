import type { Child, ChildBlock, ChildSummary, PhaseId, ProfessionalRole } from "@/types"
import { get, post, put, seg } from "./client"

/** Mes enfants : intervenant → enfants assignés uniquement ; directeur → tous les enfants du pôle. */
export function listChildren(): Promise<ChildSummary[]> {
  return get<ChildSummary[]>("/children")
}

/** Partie commune du dossier. Le directeur la lit (lecture seule). */
export function getChild(childId: string): Promise<Child> {
  return get<Child>(`/children/${seg(childId)}`)
}

/** À appeler à l'ouverture des blocs Santé et Situation judiciaire (journal d'audit). */
export function logBlockOpened(childId: string, block: ChildBlock): Promise<void> {
  return post<void>(`/children/${seg(childId)}/audit`, { block })
}

/** Modifie un bloc de la partie commune ; seul son propriétaire en a le droit. */
export function updateChildBlock<K extends Exclude<ChildBlock, "mood">>(childId: string, block: K, value: Child[K]): Promise<Child> {
  return put<Child>(`/children/${seg(childId)}/blocks/${block}`, { value })
}

/** Changement de phase du parcours : toute l'équipe d'intervenants. */
export function setPhase(childId: string, phase: PhaseId, comment: string): Promise<Child> {
  return post<Child>(`/children/${seg(childId)}/phase`, { phase, comment })
}

/** Équipe qui suit l'enfant (noms, rôles, photos) — pour l'en-tête du dossier. */
export function getChildTeam(
  childId: string,
): Promise<{ id: string; firstName: string; lastName: string; role: ProfessionalRole; avatarSeed: string; photoUrl: string | null }[]> {
  return get(`/children/${seg(childId)}/team`)
}
