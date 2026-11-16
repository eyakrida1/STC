// Transforme les données de donnees.ts en enregistrements complets de la base de démo.
// AUCUNE donnée ici : uniquement de la logique (identifiants, dates calculées, structures imbriquées).
import type {
  AttendanceEntry,
  AttendanceStatus,
  AuditEntry,
  ClosedStay,
  ISODateTime,
  ProfessionalRole,
  Roadmap,
  RoadmapPart,
  Session,
} from "@/types"
import { at, daysAgo, toISODate } from "./dates"
import {
  ABSENCE_RATE,
  DEFAULT_ASSIGNMENTS,
  donneesRoadmaps,
  donneesSeances,
  DOSSIERS_CLOS,
  FORCED_ABSENCES,
  OUVERTURES_SENSIBLES,
  propositionsEnAttente,
  REASONS,
  type RoadmapSpec,
  type SeanceSpec,
} from "./donnees"

// ───────────────────────────── Séances
const AUTHOR: Record<ProfessionalRole, string> = DEFAULT_ASSIGNMENTS

function seance(s: SeanceSpec): Session {
  const createdAt = at(s.date, 16, 30)
  return {
    id: s.id,
    childId: s.childId,
    authorId: AUTHOR[s.role],
    authorRole: s.role,
    date: s.date,
    createdAt,
    updatedAt: null,
    details: s.details,
    privateNote: s.privateNote ?? null,
    sharedNote: s.shared
      ? {
          text: s.shared.text,
          sharedAt: createdAt,
          recipients: s.shared.to.map((r) => ({
            userId: AUTHOR[r.role],
            readAt: r.readDaysAgo === null ? null : at(daysAgo(r.readDaysAgo), 9),
          })),
        }
      : null,
    aiNote: s.ai ? { text: s.ai.text, consumedByProposalId: s.ai.consumed ?? null } : null,
  }
}

export function buildSessions(): Session[] {
  return donneesSeances().map(seance)
}

// ───────────────────────────── Roadmaps
function part<T>(owner: RoadmapPart<T>["owner"], by: string, validatedAt: ISODateTime, content: T): RoadmapPart<T> {
  const v = { version: 1, content, validatedAt, validatedBy: by, decision: "initiale" as const, justification: null }
  return { owner, validated: v, pending: null, history: [v], rejected: [] }
}

function roadmap(s: RoadmapSpec): Roadmap {
  return {
    childId: s.childId,
    objective: s.objective,
    careerTrack: s.careerTrack,
    progressPercent: s.progressPercent,
    updatedAt: s.validatedAt,
    parts: {
      education: part("educateur", AUTHOR.educateur, s.validatedAt, s.education),
      psychologique: part("psychologue", AUTHOR.psychologue, s.validatedAt, s.psy),
      sociale: part("social", AUTHOR.social, s.validatedAt, s.social),
    },
  }
}

export function buildRoadmaps(): Roadmap[] {
  const roadmaps = donneesRoadmaps().map(roadmap)
  propositionsEnAttente(roadmaps)
  return roadmaps
}

// ───────────────────────────── Présence (2 mois, pseudo-aléatoire mais identique à chaque réinitialisation)
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function buildAttendance(entryDates: Record<string, string>): AttendanceEntry[] {
  const out: AttendanceEntry[] = []
  const rand = seeded(42)
  for (const [childId, entry] of Object.entries(entryDates)) {
    for (let n = 60; n >= 1; n--) {
      const date = daysAgo(n)
      const d = new Date(`${date}T12:00:00`)
      if (d.getDay() === 0) continue // dimanche fermé
      if (date < entry) continue
      let status: AttendanceStatus = "present"
      let reason: string | null = null
      const r = rand()
      if (FORCED_ABSENCES[childId]?.includes(n)) status = "absent"
      else if (r < ABSENCE_RATE[childId]) {
        const justified = rand() < 0.4
        status = justified ? "absent_justifie" : "absent"
        reason = justified ? REASONS[Math.floor(rand() * REASONS.length)] : null
      }
      out.push({ childId, date: toISODate(d), status, reason })
    }
  }
  return out
}

// ───────────────────────────── Dossiers clos et journal des accès
export function buildArchives(): ClosedStay[] {
  return DOSSIERS_CLOS.map(([e, x, dest], i) => ({
    id: `arch-${i + 1}`,
    poleId: "pole-tunis",
    entryDate: daysAgo(e),
    exitDate: daysAgo(x),
    exitDestination: dest,
  }))
}

export function buildAudit(): AuditEntry[] {
  return OUVERTURES_SENSIBLES.map(([userId, childId, action, d, h], i) => ({
    id: `audit-seed-${i + 1}`,
    userId,
    childId,
    action,
    at: at(daysAgo(d), h, 12),
  }))
}
