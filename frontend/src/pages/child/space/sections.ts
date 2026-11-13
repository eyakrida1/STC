import { CalendarCheck, CalendarDays, HandCoins, LineChart, NotebookPen } from "lucide-react"
import type { Dictionary } from "@/i18n/fr"
import type { ProfessionalRole } from "@/types"

export type SpaceSection = "seances" | "activites" | "presence" | "humeur" | "aides"

/** Sous-sections de « Mon espace » par rôle, et celles en lecture seule. */
export const SECTIONS_BY_ROLE: Record<ProfessionalRole, { key: SpaceSection; readOnly?: boolean }[]> = {
  educateur: [{ key: "seances" }, { key: "activites" }, { key: "presence" }],
  psychologue: [{ key: "seances" }, { key: "humeur" }, { key: "activites", readOnly: true }, { key: "presence", readOnly: true }],
  social: [{ key: "seances" }, { key: "aides" }, { key: "presence", readOnly: true }],
}

export function resolveSection(role: ProfessionalRole, slug: string | undefined): SpaceSection {
  const allowed = SECTIONS_BY_ROLE[role].map((s) => s.key)
  return allowed.includes(slug as SpaceSection) ? (slug as SpaceSection) : "seances"
}

export const SECTION_ICON = {
  seances: NotebookPen,
  activites: CalendarDays,
  presence: CalendarCheck,
  humeur: LineChart,
  aides: HandCoins,
} as const

export function sectionLabel(key: SpaceSection, role: ProfessionalRole, t: Dictionary): string {
  return key === "seances" ? t.sessions.space[role].title : t.followup.sections[key]
}
