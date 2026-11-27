import type {
  AiNoteStatus,
  NewSession,
  ProfessionalRole,
  ReceivedNote,
  Session,
  SessionKind,
  SessionResult,
  SessionUpdate,
} from "@/types"
import { get, post, put, seg } from "./client"

/** Chaque rôle a son type de séance (même formulaire à 3 sorties). */
export const SESSION_KIND_BY_ROLE: Record<ProfessionalRole, SessionKind> = {
  psychologue: "consultation",
  social: "visite",
  educateur: "observation",
}

/** Mes séances sur un enfant (l'auteur seul voit ses séances complètes), plus récente en haut. */
export function listMySessions(childId: string): Promise<Session[]> {
  return get<Session[]>(`/children/${seg(childId)}/sessions`)
}

export function getMySession(sessionId: string): Promise<Session> {
  return get<Session>(`/sessions/${seg(sessionId)}`)
}

/** Notes pour l'IA en attente sur cet enfant (compteur « 3 / 5 avant mise à jour automatique »). */
export function getAiNoteStatus(childId: string): Promise<AiNoteStatus> {
  return get<AiNoteStatus>(`/children/${seg(childId)}/ai-status`)
}

/** Enregistre une séance ; livre les notes partagées ; met à jour l'humeur si consultation ; déclenche l'IA au seuil. */
export function createSession(input: NewSession): Promise<SessionResult> {
  return post<SessionResult>("/sessions", input)
}

/** Correction par l'auteur pendant 24 h (conflict au-delà) ; une zone remplie ne peut pas être vidée. */
export function updateMySession(sessionId: string, update: SessionUpdate): Promise<SessionResult> {
  return put<SessionResult>(`/sessions/${seg(sessionId)}/edit`, update)
}

/** Notes reçues : notes partagées dont je suis destinataire (un enfant ou tous). */
export function listReceivedNotes(childId?: string): Promise<ReceivedNote[]> {
  return get<ReceivedNote[]>("/notes/received", { childId })
}

/** Ouvrir une note la marque comme lue pour ce lecteur seulement (chaque destinataire a son propre état). */
export function markNoteRead(sessionId: string): Promise<void> {
  return post<void>(`/sessions/${seg(sessionId)}/read`)
}

/** « Tout marquer comme lu » pour un enfant. */
export function markAllNotesRead(childId: string): Promise<void> {
  return post<void>(`/children/${seg(childId)}/notes/read-all`)
}
