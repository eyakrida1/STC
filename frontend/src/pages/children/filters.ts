import type { ChildSummary, PhaseId } from "@/types"

export type SortKey = "priorite" | "nom" | "activite"
export const SORT_KEYS: SortKey[] = ["priorite", "nom", "activite"]

export interface ChildrenFilters {
  query: string
  phase: PhaseId | null
  sort: SortKey
}

/** Une carte « a des alertes » si elle demande une action de l'utilisateur connecté. */
export function hasAlerts(c: ChildSummary): boolean {
  return c.unreadNotes > 0 || c.pendingValidation || c.recentAbsences > 0
}

/** Minuscules, sans accents : « Chaâbane » ≈ « chaabane ». */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

const byName = (a: ChildSummary, b: ChildSummary) =>
  a.firstName.localeCompare(b.firstName, "fr") || a.lastName.localeCompare(b.lastName, "fr")

export function applyFilters(children: ChildSummary[], f: ChildrenFilters): ChildSummary[] {
  const q = normalize(f.query)
  const filtered = children.filter(
    (c) =>
      (f.phase === null || c.phase === f.phase) &&
      (!q || normalize(`${c.firstName} ${c.lastName}`).includes(q) || normalize(`${c.lastName} ${c.firstName}`).includes(q)),
  )
  const sorted = [...filtered]
  if (f.sort === "nom") sorted.sort(byName)
  else if (f.sort === "activite")
    sorted.sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "") || byName(a, b))
  else sorted.sort((a, b) => Number(hasAlerts(b)) - Number(hasAlerts(a)) || byName(a, b))
  return sorted
}

export function parsePhase(v: string | null): PhaseId | null {
  const n = Number(v)
  return n >= 1 && n <= 5 ? (n as PhaseId) : null
}

export function parseSort(v: string | null): SortKey {
  return SORT_KEYS.includes(v as SortKey) ? (v as SortKey) : "priorite"
}
