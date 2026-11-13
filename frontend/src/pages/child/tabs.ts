import { isProfessional } from "@/lib/access"
import type { Role } from "@/types"

export type ChildTab = "dossier" | "espace" | "notes" | "roadmap"

/** Onglet actif lu dans l'URL (/enfants/:id/:tab). Le directeur n'a ni « Mon espace » ni « Notes reçues ». */
export function resolveTab(slug: string | undefined, role: Role): ChildTab {
  const allowed: ChildTab[] = isProfessional(role) ? ["dossier", "espace", "notes", "roadmap"] : ["dossier", "roadmap"]
  return allowed.includes(slug as ChildTab) ? (slug as ChildTab) : "dossier"
}
