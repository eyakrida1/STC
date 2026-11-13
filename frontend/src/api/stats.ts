// Tableau de bord du directeur : AGRÉGATS uniquement. Jamais le contenu des séances ni des notes,
// jamais l'humeur d'un enfant en particulier (seulement la moyenne du centre).
import { PRO_ROLES, ROADMAP_OWNERS } from "@/lib/access"
import { addDays, localISODate } from "@/lib/format"
import type { ExitDestination, ISODate, PhaseId, ProfessionalRole, RoadmapPartKey } from "@/types"
import { ApiError, db, requireUser, simulate } from "./client"

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
  pendingValidationsByRole: Record<ProfessionalRole, number>
  alerts: {
    noSession21Days: { childId: string; firstName: string; lastName: string; lastSessionDate: ISODate | null }[]
    roadmapPendingOver7Days: { childId: string; firstName: string; lastName: string; part: RoadmapPartKey; owner: ProfessionalRole; since: ISODate }[]
  }
}

const DESTINATIONS: ExitDestination[] = ["ecole", "formation", "emploi", "famille", "autre_structure", "abandon"]
const INSERTION: ExitDestination[] = ["ecole", "formation", "emploi"]
const inWindow = (d: string | null | undefined, from: ISODate, to: ISODate) => !!d && d >= from && d <= to
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : null)
const zeroByRole = (): Record<ProfessionalRole, number> => ({ educateur: 0, psychologue: 0, social: 0 })

export function getDashboardStats(period: StatsPeriod = "mois"): Promise<DashboardStats> {
  return simulate(() => {
    const me = requireUser()
    if (me.role !== "directeur") throw new ApiError("forbidden")
    const data = db()
    const len = PERIOD_DAYS[period]
    const to = localISODate()
    const from = addDays(to, -(len - 1))
    const prevTo = addDays(from, -1)
    const prevFrom = addDays(prevTo, -(len - 1))

    const children = data.children.filter((c) => c.poleId === me.poleId)
    const ids = new Set(children.map((c) => c.id))
    // tous les séjours du pôle : enfants suivis + dossiers clos archivés
    const stays = [
      ...children.flatMap((c) => c.journey.stays.map((s) => ({ ...s, childId: c.id }))),
      ...data.archives
        .filter((a) => a.poleId === me.poleId)
        .map((a) => ({ id: a.id, entryDate: a.entryDate, exitDate: a.exitDate as string | null, exitDestination: a.exitDestination as ExitDestination | null, childId: a.id })),
    ]

    const followedAt = (d: ISODate) => stays.filter((s) => s.entryDate <= d && (!s.exitDate || s.exitDate > d)).length
    const entriesIn = (f: ISODate, t: ISODate) => stays.filter((s) => inWindow(s.entryDate, f, t)).length
    const exitsIn = (f: ISODate, t: ISODate) => stays.filter((s) => inWindow(s.exitDate, f, t))
    const insertionIn = (f: ISODate, t: ISODate) => {
      const ex = exitsIn(f, t)
      return pct(ex.filter((s) => s.exitDestination && INSERTION.includes(s.exitDestination)).length, ex.length)
    }
    // retours : un séjour qui n'est pas le premier de l'enfant
    const returnsIn = (f: ISODate, t: ISODate) =>
      children.filter((c) => c.journey.stays.slice(1).some((s) => inWindow(s.entryDate, f, t))).length

    const exits = exitsIn(from, to)
    const completed = exits.filter((s) => s.exitDate)
    const averageStayMonths = completed.length
      ? Math.round(
          (completed.reduce((sum, s) => sum + (new Date(s.exitDate!).getTime() - new Date(s.entryDate).getTime()), 0) / completed.length / (30.44 * 864e5)) * 10,
        ) / 10
      : null

    const present = children.filter((c) => c.journey.status === "present")
    const byPhase = ([1, 2, 3, 4, 5] as PhaseId[]).map((phase) => ({ phase, count: present.filter((c) => c.journey.phase === phase).length }))

    // présence sur la période
    const attendance = data.attendance.filter((a) => ids.has(a.childId) && inWindow(a.date, from, to))
    const absences = new Map<string, number>()
    attendance.forEach((a) => a.status !== "present" && absences.set(a.childId, (absences.get(a.childId) ?? 0) + 1))

    // humeur moyenne du centre, 6 derniers mois (jamais par enfant)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - (5 - i))
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    })
    const moodByMonth = months.map((month) => {
      const levels = children.flatMap((c) => c.mood.history.filter((h) => h.date.startsWith(month)).map((h) => h.level))
      return {
        month,
        count: levels.length,
        average: levels.length ? Math.round((levels.reduce((s, x) => s + x, 0) / levels.length) * 10) / 10 : null,
      }
    })

    // aides : statut atteint pendant la période
    const apps = data.aidApplications.filter((a) => ids.has(a.childId))
    const aids = {
      depose: apps.filter((a) => a.status === "depose" && inWindow(a.submittedAt, from, to)).length,
      accorde: apps.filter((a) => a.status === "accorde" && inWindow(a.decidedAt, from, to)).length,
      refuse: apps.filter((a) => a.status === "refuse" && inWindow(a.decidedAt, from, to)).length,
    }

    const staff = data.users.filter((u) => u.poleId === me.poleId && u.role !== "directeur")
    const staffByRole = zeroByRole()
    staff.forEach((u) => staffByRole[u.role as ProfessionalRole]++)

    const sessions = data.sessions.filter((s) => ids.has(s.childId))
    const sessionsByRole = zeroByRole()
    sessions.filter((s) => inWindow(s.date, from, to)).forEach((s) => sessionsByRole[s.authorRole]++)

    const weekAgo = addDays(to, -7)
    const staleUnreadNotes = sessions
      .filter((s) => s.sharedNote && s.sharedNote.sharedAt.slice(0, 10) < weekAgo)
      .reduce((n, s) => n + s.sharedNote!.recipients.filter((r) => !r.readAt).length, 0)

    const pendingValidationsByRole = zeroByRole()
    const roadmapPendingOver7Days: DashboardStats["alerts"]["roadmapPendingOver7Days"] = []
    data.roadmaps
      .filter((r) => ids.has(r.childId))
      .forEach((r) =>
        (Object.keys(r.parts) as RoadmapPartKey[]).forEach((part) => {
          const p = r.parts[part]
          if (!p.pending) return
          pendingValidationsByRole[ROADMAP_OWNERS[part]]++
          const since = p.pending.createdAt.slice(0, 10)
          if (since < weekAgo) {
            const c = children.find((x) => x.id === r.childId)!
            roadmapPendingOver7Days.push({ childId: c.id, firstName: c.identity.firstName, lastName: c.identity.lastName, part, owner: ROADMAP_OWNERS[part], since })
          }
        }),
      )

    const threeWeeksAgo = addDays(to, -21)
    const noSession21Days = present
      .map((c) => {
        const last = sessions.filter((s) => s.childId === c.id).map((s) => s.date).sort().at(-1) ?? null
        return { childId: c.id, firstName: c.identity.firstName, lastName: c.identity.lastName, lastSessionDate: last }
      })
      .filter((x) => !x.lastSessionDate || x.lastSessionDate < threeWeeksAgo)

    return {
      period,
      poleName: data.poles.find((p) => p.id === me.poleId)?.name ?? "",
      from,
      to,
      kpis: {
        childrenFollowed: { value: followedAt(to), previous: followedAt(prevTo) },
        entries: { value: entriesIn(from, to), previous: entriesIn(prevFrom, prevTo) },
        exits: { value: exits.length, previous: exitsIn(prevFrom, prevTo).length },
        insertionRate: { value: insertionIn(from, to), previous: insertionIn(prevFrom, prevTo) },
        returned12m: { value: returnsIn(addDays(to, -364), to), previous: returnsIn(addDays(to, -729), addDays(to, -365)) },
      },
      byPhase,
      exitDestinations: DESTINATIONS.map((destination) => ({ destination, count: exits.filter((s) => s.exitDestination === destination).length })),
      averageStayMonths,
      attendance: {
        rate: pct(attendance.filter((a) => a.status === "present").length, attendance.length),
        childrenWithManyAbsences: children
          .filter((c) => (absences.get(c.id) ?? 0) > 3)
          .map((c) => ({ childId: c.id, firstName: c.identity.firstName, lastName: c.identity.lastName, absences: absences.get(c.id)! }))
          .sort((a, b) => b.absences - a.absences),
      },
      moodByMonth,
      aids,
      staffByRole,
      childrenPerStaff: staff
        .map((u) => ({
          userId: u.id,
          name: `${u.firstName} ${u.lastName}`,
          role: u.role as ProfessionalRole,
          count: present.filter((c) => c.assigned[u.role as ProfessionalRole] === u.id).length,
        }))
        .sort((a, b) => PRO_ROLES.indexOf(a.role) - PRO_ROLES.indexOf(b.role)),
      sessionsByRole,
      staleUnreadNotes,
      pendingValidationsByRole,
      alerts: { noSession21Days, roadmapPendingOver7Days },
    }
  })
}
