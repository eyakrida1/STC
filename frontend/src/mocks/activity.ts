// Données FICTIVES : présence (2 mois), planning d'activités, aides de l'État, notifications.
import type { Activity, AidApplication, AidProgram, AppNotification, AttendanceEntry, AttendanceStatus } from "@/types"
import { at, daysAgo, toISODate } from "./dates"

/** Générateur pseudo-aléatoire déterministe (même démo à chaque réinitialisation). */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const ABSENCE_RATE: Record<string, number> = {
  "c-yassine": 0.06,
  "c-amira": 0.08,
  "c-hamza": 0.15,
  "c-nour": 0.04,
  "c-skander": 0.02,
  "c-rania": 0.1,
}

/** Absences récentes forcées (jours avant aujourd'hui) pour alimenter les alertes. */
const FORCED_ABSENCES: Record<string, number[]> = {
  "c-hamza": [1, 2, 4],
  "c-rania": [3],
}

const REASONS = ["Rendez-vous médical", "Convocation au tribunal", "Événement familial"]

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

export function buildActivities(): Activity[] {
  const a = (id: string, childId: string, weekday: Activity["weekday"], start: string, end: string, title: string, objective: string): Activity => ({
    id,
    childId,
    weekday,
    start,
    end,
    title,
    objective,
    weekStart: null,
  })
  return [
    a("a-yas-1", "c-yassine", 2, "10:00", "12:00", "Atelier électricité", "Travailler la patience"),
    a("a-yas-2", "c-yassine", 4, "10:00", "12:00", "Atelier électricité", "Lire un schéma simple"),
    a("a-yas-3", "c-yassine", 3, "14:00", "15:00", "Soutien en lecture", "Lecture à voix haute"),
    a("a-yas-4", "c-yassine", 6, "09:30", "11:00", "Football", "Respect des règles collectives"),
    a("a-ami-1", "c-amira", 1, "14:00", "15:30", "Atelier dessin", "S'exprimer autrement qu'à l'oral"),
    a("a-ami-2", "c-amira", 3, "10:00", "11:00", "Évaluation scolaire", "Situer le niveau réel"),
    a("a-ham-1", "c-hamza", 1, "10:00", "12:00", "Atelier cuisine", "Assumer une responsabilité dans l'équipe"),
    a("a-ham-2", "c-hamza", 3, "10:00", "12:00", "Atelier cuisine", "Respect des consignes"),
    a("a-ham-3", "c-hamza", 5, "14:00", "15:00", "Remise à niveau en français", "Écrire une recette"),
    a("a-nou-1", "c-nour", 2, "08:00", "13:00", "Stage pâtisserie", "Ponctualité et gestes professionnels"),
    a("a-nou-2", "c-nour", 4, "14:00", "15:00", "Soutien en calcul", "Proportions et conversions"),
    a("a-ska-1", "c-skander", 1, "08:00", "16:00", "Formation mécanique", "Suivi de la formation"),
    a("a-ran-1", "c-rania", 2, "14:00", "15:00", "Soutien en lecture", "Lire une courte histoire"),
    a("a-ran-2", "c-rania", 5, "10:00", "11:30", "Atelier chant", "Reprendre confiance en groupe"),
  ]
}

export const AID_PROGRAMS: AidProgram[] = [
  { id: "aid-pnafn", label: "Aide aux familles nécessiteuses" },
  { id: "aid-amg1", label: "Carte de soins gratuits" },
  { id: "aid-amg2", label: "Carte de soins à tarif réduit" },
  { id: "aid-rentree", label: "Aide à la rentrée scolaire" },
]

export function buildAidApplications(): AidApplication[] {
  return [
    {
      id: "ap-yas-1",
      childId: "c-yassine",
      programId: "aid-pnafn",
      beneficiary: "famille",
      status: "depose",
      submittedAt: daysAgo(15),
      decidedAt: null,
      missingDocuments: "",
    },
    {
      id: "ap-nou-1",
      childId: "c-nour",
      programId: "aid-rentree",
      beneficiary: "enfant",
      status: "accorde",
      submittedAt: daysAgo(80),
      decidedAt: daysAgo(50),
      missingDocuments: "",
    },
    {
      id: "ap-ran-1",
      childId: "c-rania",
      programId: "aid-pnafn",
      beneficiary: "famille",
      status: "a_preparer",
      submittedAt: null,
      decidedAt: null,
      missingDocuments: "Certificat de résidence, bulletin de salaire de la mère",
    },
    {
      id: "ap-ham-1",
      childId: "c-hamza",
      programId: "aid-amg2",
      beneficiary: "famille",
      status: "refuse",
      submittedAt: daysAgo(70),
      decidedAt: daysAgo(30),
      missingDocuments: "",
    },
    {
      id: "ap-ami-1",
      childId: "c-amira",
      programId: "aid-amg1",
      beneficiary: "famille",
      status: "a_preparer",
      submittedAt: null,
      decidedAt: null,
      missingDocuments: "Attestation d'hébergement",
    },
  ]
}

export function buildNotifications(): AppNotification[] {
  const n = (id: string, userId: string, kind: AppNotification["kind"], childId: string, d: number, read = false): AppNotification => ({
    id,
    userId,
    kind,
    childId,
    createdAt: at(daysAgo(d), 17),
    readAt: read ? at(daysAgo(d - 1 < 0 ? 0 : d - 1), 9) : null,
  })
  return [
    n("n-1", "u-edu", "note_recue", "c-amira", 5),
    n("n-2", "u-edu", "note_recue", "c-hamza", 6),
    n("n-3", "u-edu", "validation_attendue", "c-nour", 3),
    n("n-4", "u-edu", "absence", "c-hamza", 1),
    n("n-5", "u-psy", "validation_attendue", "c-hamza", 9),
    n("n-6", "u-psy", "note_recue", "c-nour", 4),
    n("n-7", "u-soc", "note_recue", "c-nour", 4),
    n("n-8", "u-soc", "note_recue", "c-amira", 5, true),
    n("n-9", "u-dir", "roadmap_mise_a_jour", "c-skander", 20, true),
  ]
}
