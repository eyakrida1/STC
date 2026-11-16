// Point d'entrée de la base de démo. Données : donnees.ts ; logique de construction : construire.ts.
// Importé UNIQUEMENT par src/api/ (règle vérifiée par oxlint).
import type {
  Activity,
  AidApplication,
  AidProgram,
  AppNotification,
  AttendanceEntry,
  AuditEntry,
  Child,
  ClosedStay,
  Pole,
  Roadmap,
  Session,
  User,
} from "@/types"
import { buildArchives, buildAttendance, buildAudit, buildRoadmaps, buildSessions } from "./construire"
import {
  AID_PROGRAMS,
  CREDENTIALS,
  donneesActivites,
  donneesDemandesAides,
  donneesEnfants,
  donneesNotifications,
  POLES,
  USERS,
} from "./donnees"

export interface DemoDatabase {
  version: number
  seededAt: string
  poles: Pole[]
  users: User[]
  credentials: Record<string, string>
  children: Child[]
  sessions: Session[]
  roadmaps: Roadmap[]
  attendance: AttendanceEntry[]
  activities: Activity[]
  aidPrograms: AidProgram[]
  aidApplications: AidApplication[]
  notifications: AppNotification[]
  audit: AuditEntry[]
  archives: ClosedStay[]
}

export const DEMO_DB_VERSION = 6

export function buildSeed(): DemoDatabase {
  const children = donneesEnfants()
  return {
    version: DEMO_DB_VERSION,
    seededAt: new Date().toISOString(),
    poles: POLES,
    users: USERS,
    credentials: CREDENTIALS,
    children,
    sessions: buildSessions(),
    roadmaps: buildRoadmaps(),
    attendance: buildAttendance(Object.fromEntries(children.map((c) => [c.id, c.journey.entryDate]))),
    activities: donneesActivites(),
    aidPrograms: AID_PROGRAMS,
    aidApplications: donneesDemandesAides(),
    notifications: donneesNotifications(),
    audit: buildAudit(),
    archives: buildArchives(),
  }
}
