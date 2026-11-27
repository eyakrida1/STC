// Journal des accès aux blocs sensibles (Santé, Situation judiciaire) : lu UNIQUEMENT par le directeur de son pôle.
// Il ne contient que la trace (qui, quel enfant, quel bloc, quand), jamais le contenu du bloc.
import type { Role } from "@/types"
import { get } from "./client"
import type { StatsPeriod } from "./stats"

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
  return get<AuditLog>("/audit/sensitive-access", { childId: filters.childId, userId: filters.userId, period: filters.period })
}
