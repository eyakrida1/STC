// Présence, planning d'activités, aides de l'État, échelles d'humeur.
import { canEditActivities, canEditAids, canEditAttendance, isProfessional } from "@/lib/access"
import type {
  Activity,
  AidApplication,
  AidProgram,
  AttendanceEntry,
  ISODate,
  MoodScales,
} from "@/types"
import { localISODate } from "@/lib/format"
import { ApiError, db, newId, persist, requireChild, requireUser, simulate } from "./client"

// ───────────────────────────── Présence (saisie : éducateur ; lecture : psy, social)
export function getAttendance(childId: string, from: ISODate, to: ISODate): Promise<AttendanceEntry[]> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!isProfessional(me.role)) throw new ApiError("forbidden")
    return db()
      .attendance.filter((a) => a.childId === childId && a.date >= from && a.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date))
  })
}

export function setAttendance(entry: AttendanceEntry): Promise<AttendanceEntry> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, entry.childId)
    if (!canEditAttendance(me.role)) throw new ApiError("forbidden")
    if (entry.date > localISODate()) throw new ApiError("invalid") // pas de saisie dans le futur
    if (new Date(`${entry.date}T12:00:00`).getDay() === 0) throw new ApiError("invalid") // centre fermé le dimanche
    if (entry.status === "absent_justifie" && !entry.reason?.trim()) throw new ApiError("invalid") // motif obligatoire
    if (entry.status === "present") entry = { ...entry, reason: null }
    const list = db().attendance
    const i = list.findIndex((a) => a.childId === entry.childId && a.date === entry.date)
    if (i >= 0) list[i] = entry
    else list.push(entry)
    persist()
    return entry
  })
}

// ───────────────────────────── Planning d'activités (éducateur ; psy en lecture)
/** Planning d'une semaine : activités de chaque semaine + activités ponctuelles de cette semaine (lundi = weekStart). */
export function listActivities(childId: string, weekStart?: ISODate): Promise<Activity[]> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (me.role !== "educateur" && me.role !== "psychologue") throw new ApiError("forbidden")
    return db()
      .activities.filter((a) => a.childId === childId && (!a.weekStart || a.weekStart === weekStart))
      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
  })
}

export function saveActivity(activity: Omit<Activity, "id"> & { id?: string }): Promise<Activity> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, activity.childId)
    if (!canEditActivities(me.role)) throw new ApiError("forbidden")
    if (!activity.title.trim() || activity.start >= activity.end) throw new ApiError("invalid")
    const list = db().activities
    const saved: Activity = { ...activity, id: activity.id ?? newId("a") }
    const i = list.findIndex((a) => a.id === saved.id)
    if (i >= 0) list[i] = saved
    else list.push(saved)
    persist()
    return saved
  })
}

export function deleteActivity(activityId: string): Promise<void> {
  return simulate(() => {
    const me = requireUser()
    const list = db().activities
    const a = list.find((x) => x.id === activityId)
    if (!a) throw new ApiError("not_found")
    requireChild(me, a.childId)
    if (!canEditActivities(me.role)) throw new ApiError("forbidden")
    list.splice(list.indexOf(a), 1)
    persist()
  })
}

// ───────────────────────────── Aides de l'État (social ; toute l'équipe voit le statut)
export function listAidPrograms(): Promise<AidProgram[]> {
  return simulate(() => {
    requireUser()
    return db().aidPrograms
  })
}

export function listAidApplications(childId: string): Promise<AidApplication[]> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    return db()
      .aidApplications.filter((a) => a.childId === childId)
      .map((a) => (canEditAids(me.role) ? a : { ...a, missingDocuments: "" }))
  })
}

export function saveAidApplication(app: Omit<AidApplication, "id"> & { id?: string }): Promise<AidApplication> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, app.childId)
    if (!canEditAids(me.role)) throw new ApiError("forbidden")
    if (app.status !== "a_preparer" && !app.submittedAt) throw new ApiError("invalid")
    if ((app.status === "accorde" || app.status === "refuse") && !app.decidedAt) throw new ApiError("invalid")
    const list = db().aidApplications
    const saved: AidApplication = { ...app, id: app.id ?? newId("ap") }
    const i = list.findIndex((a) => a.id === saved.id)
    if (i >= 0) list[i] = saved
    else list.push(saved)
    persist()
    return saved
  })
}

// ───────────────────────────── Échelles d'humeur (psychologue uniquement)
export function listMoodScales(childId: string): Promise<{ sessionId: string; date: ISODate; scales: MoodScales }[]> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (me.role !== "psychologue") throw new ApiError("forbidden")
    return db()
      .sessions.filter((s) => s.childId === childId && s.authorId === me.id && s.details.kind === "consultation")
      .map((s) => ({ sessionId: s.id, date: s.date, scales: (s.details as { scales: MoodScales }).scales }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })
}
