// Journal des accès aux blocs sensibles (Santé, Situation judiciaire).
// Écrit par `logBlockOpened` (api/children.ts) à chaque ouverture ; lu UNIQUEMENT par le directeur de son pôle.
// Il ne contient que la trace (qui, quel enfant, quel bloc, quand), jamais le contenu du bloc.
import { addDays, localISODate } from "@/lib/format"
import type { AuditEntry, Role } from "@/types"
import { ApiError, db, requireUser, simulate } from "./client"
import { PERIOD_DAYS, type StatsPeriod } from "./stats"

export interface AuditView {
  id: string
  at: string
  block: "health" | "legal"
  userId: string
  userName: string
  userRole: Role
  childId: string
  childName: string
}

export interface AuditFilters {
  childId?: string
  userId?: string
  /** absent = tout l'historique */
  period?: StatsPeriod
}

export interface AuditLog {
  entries: AuditView[]
  /** listes pour les filtres (enfants et personnes du pôle) */
  children: { id: string; name: string }[]
  users: { id: string; name: string; role: Role }[]
}

export function listSensitiveAccess(filters: AuditFilters = {}): Promise<AuditLog> {
  return simulate(() => {
    const me = requireUser()
    if (me.role !== "directeur") throw new ApiError("forbidden")
    const data = db()
    const children = data.children.filter((c) => c.poleId === me.poleId)
    const users = data.users.filter((u) => u.poleId === me.poleId)
    const childIds = new Set(children.map((c) => c.id))
    const since = filters.period ? addDays(localISODate(), -(PERIOD_DAYS[filters.period] - 1)) : null

    const keep = (a: AuditEntry) =>
      childIds.has(a.childId) &&
      (!filters.childId || a.childId === filters.childId) &&
      (!filters.userId || a.userId === filters.userId) &&
      (!since || a.at.slice(0, 10) >= since)

    const entries = data.audit
      .filter(keep)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((a): AuditView => {
        const u = users.find((x) => x.id === a.userId)
        const c = children.find((x) => x.id === a.childId)!
        return {
          id: a.id,
          at: a.at,
          block: a.action === "ouverture_sante" ? "health" : "legal",
          userId: a.userId,
          userName: u ? `${u.firstName} ${u.lastName}` : a.userId,
          userRole: u?.role ?? "educateur",
          childId: c.id,
          childName: `${c.identity.firstName} ${c.identity.lastName}`,
        }
      })

    return {
      entries,
      children: children.map((c) => ({ id: c.id, name: `${c.identity.firstName} ${c.identity.lastName}` })),
      users: users.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, role: u.role })),
    }
  })
}
