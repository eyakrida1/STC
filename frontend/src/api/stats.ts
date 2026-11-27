// Tableau de bord du directeur : AGRÉGATS uniquement. Jamais le contenu des séances ni des notes,
// jamais l'humeur d'un enfant en particulier (seulement la moyenne du centre).
// Calculés par le backend (backend/cdis/views/stats.py) sur les données du pôle du directeur.
import type { ExitDestination, ISODate, PhaseId, ProfessionalRole, RoadmapPartKey } from "@/types"
import { get } from "./client"

export type StatsPeriod = "mois" | "trimestre" | "annee"
export const PERIOD_DAYS: Record<StatsPeriod, number> = { mois: 30, trimestre: 91, annee: 365 }

/** Valeur de la période et valeur de la période précédente (même durée, juste avant). */
export interface Kpi {
  value: number | null
  previous: number | null
}

export interface DashboardStats {
  period: StatsPeriod
  poleName: string
  from: ISODate
  to: ISODate
  kpis: {
    childrenFollowed: Kpi
    entries: Kpi
    exits: Kpi
    insertionRate: Kpi // en %
    returned12m: Kpi
  }
  byPhase: { phase: PhaseId; count: number }[]
  exitDestinations: { destination: ExitDestination; count: number }[]
  averageStayMonths: number | null
  attendance: {
    rate: number | null // en %
    childrenWithManyAbsences: { childId: string; firstName: string; lastName: string; absences: number }[]
  }
  moodByMonth: { month: string; average: number | null; count: number }[] // 6 derniers mois
  aids: { depose: number; accorde: number; refuse: number }
  staffByRole: Record<ProfessionalRole, number>
  childrenPerStaff: { userId: string; name: string; role: ProfessionalRole; count: number }[]
  sessionsByRole: Record<ProfessionalRole, number>
  staleUnreadNotes: number
  /** ouvertures des blocs Santé / Situation judiciaire sur la période (journal des accès) */
  sensitiveAccess: number
  pendingValidationsByRole: Record<ProfessionalRole, number>
  alerts: {
    noSession21Days: { childId: string; firstName: string; lastName: string; lastSessionDate: ISODate | null }[]
    roadmapPendingOver7Days: { childId: string; firstName: string; lastName: string; part: RoadmapPartKey; owner: ProfessionalRole; since: ISODate }[]
  }
}

export function getDashboardStats(period: StatsPeriod = "mois"): Promise<DashboardStats> {
  return get<DashboardStats>("/stats/dashboard", { period })
}
