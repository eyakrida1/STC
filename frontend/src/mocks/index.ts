// Point d'entrée des données FICTIVES. Importé UNIQUEMENT par src/api/ (règle vérifiée par oxlint).
import type {
  Activity,
  AidApplication,
  AidProgram,
  AppNotification,
  AttendanceEntry,
  AuditEntry,
  Child,
  Pole,
  Roadmap,
  Session,
  User,
} from "@/types"
import { AID_PROGRAMS, buildActivities, buildAidApplications, buildAttendance, buildNotifications } from "./activity"
import { buildChildren } from "./children"
import { buildRoadmaps } from "./roadmaps"
import { buildSessions } from "./sessions"
import { CREDENTIALS, POLES, USERS } from "./users"

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
}

export const DEMO_DB_VERSION = 3

export function buildSeed(): DemoDatabase {
  const children = buildChildren()
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
    activities: buildActivities(),
    aidPrograms: AID_PROGRAMS,
    aidApplications: buildAidApplications(),
    notifications: buildNotifications(),
    audit: [],
  }
}
