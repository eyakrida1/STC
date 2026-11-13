// Correspondances statiques valeur métier → classes Tailwind (chaînes complètes pour que Tailwind les détecte).
import type { MoodLevel, PhaseId, Role } from "@/types"

export const ROLE_DOT: Record<Role, string> = {
  educateur: "bg-role-educateur",
  psychologue: "bg-role-psychologue",
  social: "bg-role-social",
  directeur: "bg-role-directeur",
}

export const ROLE_SOFT_BG: Record<Role, string> = {
  educateur: "bg-role-educateur/10",
  psychologue: "bg-role-psychologue/10",
  social: "bg-role-social/10",
  directeur: "bg-role-directeur/10",
}

export const ROLE_BORDER: Record<Role, string> = {
  educateur: "border-s-role-educateur",
  psychologue: "border-s-role-psychologue",
  social: "border-s-role-social",
  directeur: "border-s-role-directeur",
}

export const MOOD_DOT: Record<MoodLevel, string> = {
  1: "bg-mood-1",
  2: "bg-mood-2",
  3: "bg-mood-3",
  4: "bg-mood-4",
  5: "bg-mood-5",
}

export const MOOD_SOFT_BG: Record<MoodLevel, string> = {
  1: "bg-mood-1/12",
  2: "bg-mood-2/12",
  3: "bg-mood-3/15",
  4: "bg-mood-4/12",
  5: "bg-mood-5/12",
}

/** Couleur CSS brute (halo de l'avatar, graphiques). */
export const MOOD_COLOR_VAR: Record<MoodLevel, string> = {
  1: "var(--cdis-mood-1)",
  2: "var(--cdis-mood-2)",
  3: "var(--cdis-mood-3)",
  4: "var(--cdis-mood-4)",
  5: "var(--cdis-mood-5)",
}

export const PHASE_DOT: Record<PhaseId, string> = {
  1: "bg-phase-1",
  2: "bg-phase-2",
  3: "bg-phase-3",
  4: "bg-phase-4",
  5: "bg-phase-5",
}

export const PHASE_BADGE: Record<PhaseId, string> = {
  1: "bg-phase-1-soft text-phase-1-ink",
  2: "bg-phase-2-soft text-phase-2-ink",
  3: "bg-phase-3-soft text-phase-3-ink",
  4: "bg-phase-4-soft text-phase-4-ink",
  5: "bg-phase-5-soft text-phase-5-ink",
}

export const PHASE_COLOR_VAR: Record<PhaseId, string> = {
  1: "var(--cdis-phase-1)",
  2: "var(--cdis-phase-2)",
  3: "var(--cdis-phase-3)",
  4: "var(--cdis-phase-4)",
  5: "var(--cdis-phase-5)",
}
