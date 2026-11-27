// Présence, planning d'activités, aides de l'État, échelles d'humeur.
import type { Activity, AidApplication, AidProgram, AttendanceEntry, ISODate, MoodScales } from "@/types"
import { del, get, post, put, seg } from "./client"

// ───────────────────────────── Présence (saisie : éducateur ; lecture : psy, social)
export function getAttendance(childId: string, from: ISODate, to: ISODate): Promise<AttendanceEntry[]> {
  return get<AttendanceEntry[]>(`/children/${seg(childId)}/attendance`, { from, to })
}

export function setAttendance(entry: AttendanceEntry): Promise<AttendanceEntry> {
  return put<AttendanceEntry>("/attendance", entry)
}

// ───────────────────────────── Planning d'activités (éducateur ; psy en lecture)
/** Planning d'une semaine : activités de chaque semaine + activités ponctuelles de cette semaine (lundi = weekStart). */
export function listActivities(childId: string, weekStart?: ISODate): Promise<Activity[]> {
  return get<Activity[]>(`/children/${seg(childId)}/activities`, { weekStart })
}

export function saveActivity(activity: Omit<Activity, "id"> & { id?: string }): Promise<Activity> {
  return post<Activity>("/activities", activity)
}

export function deleteActivity(activityId: string): Promise<void> {
  return del<void>(`/activities/${seg(activityId)}`)
}

// ───────────────────────────── Aides de l'État (social ; toute l'équipe voit le statut)
export function listAidPrograms(): Promise<AidProgram[]> {
  return get<AidProgram[]>("/aid-programs")
}

export function listAidApplications(childId: string): Promise<AidApplication[]> {
  return get<AidApplication[]>(`/children/${seg(childId)}/aid-applications`)
}

export function saveAidApplication(app: Omit<AidApplication, "id"> & { id?: string }): Promise<AidApplication> {
  return post<AidApplication>("/aid-applications", app)
}

// ───────────────────────────── Échelles d'humeur (psychologue uniquement)
export function listMoodScales(childId: string): Promise<{ sessionId: string; date: ISODate; scales: MoodScales }[]> {
  return get(`/children/${seg(childId)}/mood-scales`)
}
