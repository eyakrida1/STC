// Tableau de bord du directeur : agrégats uniquement, jamais le contenu des séances ni l'humeur par enfant.
import { addDays, localISODate } from "@/lib/format"
import type { ExitDestination, PhaseId, ProfessionalRole } from "@/types"
import { ApiError, db, requireUser, simulate } from "./client"

export type StatsPeriod = "mois" | "trimestre" | "annee"

export interface DashboardStats {
  period: StatsPeriod
  childrenFollowed: number
  entries: number
  exits: number
  insertionRate: number | null // 0..1
  returnedLast12Months: number
  byPhase: Record<PhaseId, number>
  exitDestinations: Record<ExitDestination, number>
  attendanceRate: number // 0..1, sur la période
  childrenWithManyAbsences: { childId: string; firstName: string; absences: number }[]
  averageMoodByMonth: { month: string; average: number }[]
  childrenPerStaff: { userId: string; name: string; role: ProfessionalRole; count: number }[]
  sessionsByRole: Record<ProfessionalRole, number>
  staleUnreadNotes: number // non lues depuis plus de 7 jours
  pendingValidationsByRole: Record<ProfessionalRole, number>
  alerts: {
    noSessionFor21Days: { childId: string; firstName: string }[]
    roadmapPendingOver7Days: { childId: string; firstName: string; part: string }[]
  }
}

const PERIOD_DAYS: Record<StatsPeriod, number> = { mois: 30, trimestre: 91, annee: 365 }

export function getDashboardStats(period: StatsPeriod = "mois"): Promise<DashboardStats> {
  return simulate(() => {
    const me = requireUser()
    if (me.role !== "directeur") throw new ApiError("forbidden")
    const data = db()
    const today = localISODate()
    const since = addDays(today, -PERIOD_DAYS[period])
    const children = data.children.filter((c) => c.poleId === me.poleId)
    const ids = new Set(children.map((c) => c.id))
    const present = children.filter((c) => c.journey.status === "present")

    const stays = children.flatMap((c) => c.journey.stays)
    const exitsInPeriod = stays.filter((s) => s.exitDate && s.exitDate >= since)
    const allExits = stays.filter((s) => s.exitDate)
    const exitDestinations = { ecole: 0, formation: 0, emploi: 0, famille: 0, autre_structure: 0, abandon: 0 }
    allExits.forEach((s) => s.exitDestination && exitDestinations[s.exitDestination]++)
    const inserted = exitsInPeriod.filter((s) => ["ecole", "formation", "emploi"].includes(s.exitDestination ?? ""))

    const byPhase = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<PhaseId, number>
    present.forEach((c) => byPhase[c.journey.phase]++)

    const attendance = data.attendance.filter((a) => ids.has(a.childId) && a.date >= since)
    const absences = new Map<string, number>()
    attendance.forEach((a) => a.status === "absent" && absences.set(a.childId, (absences.get(a.childId) ?? 0) + 1))

    // Humeur moyenne du centre par mois (jamais par enfant)
    const months = new Map<string, number[]>()
    children.forEach((c) =>
      c.mood.history.forEach((h) => {
        const m = h.date.slice(0, 7)
        months.set(m, [...(months.get(m) ?? []), h.level])
      }),
    )
    const averageMoodByMonth = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({ month, average: Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 10) / 10 }))

    const staff = data.users.filter((u) => u.poleId === me.poleId && u.role !== "directeur")
    const sessions = data.sessions.filter((s) => ids.has(s.childId))
    const sessionsByRole = { educateur: 0, psychologue: 0, social: 0 }
    sessions.filter((s) => s.date >= since).forEach((s) => sessionsByRole[s.authorRole]++)

    const weekAgo = addDays(today, -7)
    const staleUnreadNotes = sessions
      .filter((s) => s.sharedNote && s.sharedNote.sharedAt.slice(0, 10) < weekAgo)
      .reduce((n, s) => n + s.sharedNote!.recipients.filter((r) => !r.readAt).length, 0)

    const pendingValidationsByRole = { educateur: 0, psychologue: 0, social: 0 }
    const roadmapPendingOver7Days: DashboardStats["alerts"]["roadmapPendingOver7Days"] = []
    data.roadmaps
      .filter((r) => ids.has(r.childId))
      .forEach((r) =>
        Object.entries(r.parts).forEach(([key, p]) => {
          if (!p.pending) return
          pendingValidationsByRole[p.owner]++
          if (p.pending.createdAt.slice(0, 10) < weekAgo) {
            const c = children.find((x) => x.id === r.childId)!
            roadmapPendingOver7Days.push({ childId: c.id, firstName: c.identity.firstName, part: key })
          }
        }),
      )

    const threeWeeksAgo = addDays(today, -21)
    const noSessionFor21Days = present
      .filter((c) => !sessions.some((s) => s.childId === c.id && s.date >= threeWeeksAgo))
      .map((c) => ({ childId: c.id, firstName: c.identity.firstName }))

    return {
      period,
      childrenFollowed: present.length,
      entries: stays.filter((s) => s.entryDate >= since).length,
      exits: exitsInPeriod.length,
      insertionRate: exitsInPeriod.length ? inserted.length / exitsInPeriod.length : null,
      returnedLast12Months: children.filter((c) =>
        c.journey.stays.slice(1).some((s) => s.entryDate >= addDays(today, -365)),
      ).length,
      byPhase,
      exitDestinations,
      attendanceRate: attendance.length
        ? attendance.filter((a) => a.status === "present").length / attendance.length
        : 1,
      childrenWithManyAbsences: children
        .filter((c) => (absences.get(c.id) ?? 0) > 3)
        .map((c) => ({ childId: c.id, firstName: c.identity.firstName, absences: absences.get(c.id)! })),
      averageMoodByMonth,
      childrenPerStaff: staff.map((u) => ({
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role as ProfessionalRole,
        count: present.filter((c) => c.assigned[u.role as ProfessionalRole] === u.id).length,
      })),
      sessionsByRole,
      staleUnreadNotes,
      pendingValidationsByRole,
      alerts: { noSessionFor21Days, roadmapPendingOver7Days },
    }
  })
}

