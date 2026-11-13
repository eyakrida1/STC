import { AI_AUTO_UPDATE_THRESHOLD, canEditSession, isProfessional } from "@/lib/access"
import type {
  AiNoteStatus,
  Child,
  NewSession,
  ProfessionalRole,
  ReceivedNote,
  Session,
  SessionKind,
  SessionResult,
  SessionUpdate,
  User,
} from "@/types"
import { ApiError, db, newId, nowISO, persist, requireChild, requireUser, simulate } from "./client"
import { notify } from "./notifications"
import { generateProposalSync, pendingAiNoteCount } from "./roadmap"

/** Chaque rôle a son type de séance (même formulaire à 3 sorties). */
export const SESSION_KIND_BY_ROLE: Record<ProfessionalRole, SessionKind> = {
  psychologue: "consultation",
  social: "visite",
  educateur: "observation",
}

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null)

/** Mes séances sur un enfant (l'auteur seul voit ses séances complètes), plus récente en haut. */
export function listMySessions(childId: string): Promise<Session[]> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!isProfessional(me.role)) throw new ApiError("forbidden")
    return db()
      .sessions.filter((s) => s.childId === childId && s.authorId === me.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  })
}

export function getMySession(sessionId: string): Promise<Session> {
  return simulate(() => {
    const me = requireUser()
    const s = db().sessions.find((x) => x.id === sessionId)
    if (!s) throw new ApiError("not_found")
    if (s.authorId !== me.id) throw new ApiError("forbidden")
    return s
  })
}

/** Notes pour l'IA en attente sur cet enfant (compteur « 3 / 5 avant mise à jour automatique »). */
export function getAiNoteStatus(childId: string): Promise<AiNoteStatus> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!isProfessional(me.role)) throw new ApiError("forbidden")
    return { pending: pendingAiNoteCount(childId), threshold: AI_AUTO_UPDATE_THRESHOLD }
  })
}

function validateZones(input: { privateNote: string | null; sharedNote: { text: string; recipientIds: string[] } | null; aiNote: string | null }) {
  const hasShared = !!clean(input.sharedNote?.text) && (input.sharedNote?.recipientIds.length ?? 0) > 0
  if (!clean(input.privateNote) && !hasShared && !clean(input.aiNote)) throw new ApiError("invalid") // au moins une zone
  if (clean(input.sharedNote?.text) && !input.sharedNote?.recipientIds.length) throw new ApiError("invalid")
}

/** Seule l'humeur générale est partagée (elle anime l'avatar) ; les autres échelles restent chez le psy. */
function applyMood(child: Child, session: Session, me: User) {
  if (session.details.kind !== "consultation") return
  const level = session.details.scales.humeur
  child.mood.level = level
  child.mood.updatedAt = nowISO()
  child.mood.updatedBy = me.id
  const sameDay = child.mood.history.findLast((h) => h.date === session.date)
  if (sameDay) sameDay.level = level
  else child.mood.history.push({ date: session.date, level })
}

function maybeAutoProposal(childId: string): boolean {
  if (pendingAiNoteCount(childId) < AI_AUTO_UPDATE_THRESHOLD) return false
  generateProposalSync(childId, "auto", null)
  return true
}

/** Enregistre une séance ; livre les notes partagées ; met à jour l'humeur si consultation ; déclenche l'IA au seuil. */
export function createSession(input: NewSession): Promise<SessionResult> {
  return simulate(() => {
    const me = requireUser()
    if (!isProfessional(me.role)) throw new ApiError("forbidden")
    const child = requireChild(me, input.childId)
    if (input.details.kind !== SESSION_KIND_BY_ROLE[me.role]) throw new ApiError("invalid")
    validateZones(input)

    const team = Object.values(child.assigned)
    const recipients = (input.sharedNote?.recipientIds ?? []).filter((id) => id !== me.id && team.includes(id))
    const now = nowISO()
    const sharedText = clean(input.sharedNote?.text)
    const aiText = clean(input.aiNote)

    const session: Session = {
      id: newId("se"),
      childId: child.id,
      authorId: me.id,
      authorRole: me.role,
      date: input.date,
      createdAt: now,
      updatedAt: null,
      details: input.details,
      privateNote: clean(input.privateNote),
      sharedNote:
        sharedText && recipients.length
          ? { text: sharedText, sharedAt: now, recipients: recipients.map((userId) => ({ userId, readAt: null })) }
          : null,
      aiNote: aiText ? { text: aiText, consumedByProposalId: null } : null,
    }
    db().sessions.push(session)
    session.sharedNote?.recipients.forEach((r) => notify(r.userId, "note_recue", child.id))
    applyMood(child, session, me)
    const roadmapProposed = !!aiText && maybeAutoProposal(child.id)
    persist()
    return { session, child, roadmapProposed }
  })
}

/**
 * Correction par l'auteur pendant 24 h. Une note ne se supprime jamais : une zone remplie ne peut pas être vidée,
 * les destinataires déjà servis sont conservés (on peut en ajouter), une note déjà utilisée par l'IA est figée.
 */
export function updateMySession(sessionId: string, update: SessionUpdate): Promise<SessionResult> {
  return simulate(() => {
    const me = requireUser()
    const s = db().sessions.find((x) => x.id === sessionId)
    if (!s) throw new ApiError("not_found")
    if (s.authorId !== me.id) throw new ApiError("forbidden")
    if (!canEditSession(s)) throw new ApiError("conflict")
    if (update.details.kind !== s.details.kind) throw new ApiError("invalid")
    const child = requireChild(me, s.childId)
    validateZones(update)

    const privateNote = clean(update.privateNote)
    const sharedText = clean(update.sharedNote?.text)
    const aiText = clean(update.aiNote)
    if ((s.privateNote && !privateNote) || (s.sharedNote && !sharedText) || (s.aiNote && !aiText)) {
      throw new ApiError("invalid")
    }
    const now = nowISO()

    s.date = update.date
    s.details = update.details
    s.privateNote = privateNote

    if (sharedText) {
      const team = Object.values(child.assigned)
      const wanted = (update.sharedNote?.recipientIds ?? []).filter((id) => id !== me.id && team.includes(id))
      if (!s.sharedNote) {
        s.sharedNote = { text: sharedText, sharedAt: now, recipients: wanted.map((userId) => ({ userId, readAt: null })) }
        wanted.forEach((id) => notify(id, "note_recue", child.id))
      } else {
        const textChanged = s.sharedNote.text !== sharedText
        s.sharedNote.text = sharedText
        for (const id of wanted) {
          if (!s.sharedNote.recipients.some((r) => r.userId === id)) {
            s.sharedNote.recipients.push({ userId: id, readAt: null })
            notify(id, "note_recue", child.id)
          }
        }
        if (textChanged) {
          // le texte a changé : chaque destinataire doit la relire
          s.sharedNote.recipients.forEach((r) => {
            r.readAt = null
            notify(r.userId, "note_recue", child.id)
          })
        }
      }
    }

    let roadmapProposed = false
    if (aiText) {
      if (!s.aiNote) {
        s.aiNote = { text: aiText, consumedByProposalId: null }
        roadmapProposed = maybeAutoProposal(child.id)
      } else if (!s.aiNote.consumedByProposalId) {
        s.aiNote.text = aiText
      }
    }

    s.updatedAt = now
    applyMood(child, s, me)
    persist()
    return { session: s, child, roadmapProposed }
  })
}

/** Notes reçues : notes partagées dont je suis destinataire (un enfant ou tous). */
export function listReceivedNotes(childId?: string): Promise<ReceivedNote[]> {
  return simulate(() => {
    const me = requireUser()
    if (!isProfessional(me.role)) throw new ApiError("forbidden")
    if (childId) requireChild(me, childId)
    const users = db().users
    return db()
      .sessions.filter((s) => (!childId || s.childId === childId) && s.sharedNote)
      .flatMap((s) => {
        const mine = s.sharedNote!.recipients.find((r) => r.userId === me.id)
        if (!mine) return []
        const author = users.find((u) => u.id === s.authorId)!
        const note: ReceivedNote = {
          sessionId: s.id,
          childId: s.childId,
          authorId: s.authorId,
          authorName: `${author.firstName} ${author.lastName}`,
          authorRole: s.authorRole,
          authorAvatarSeed: author.avatarSeed,
          sessionKind: s.details.kind,
          sessionDate: s.date,
          sharedAt: s.sharedNote!.sharedAt,
          text: s.sharedNote!.text,
          readAt: mine.readAt,
        }
        return [note]
      })
      .sort((a, b) => b.sharedAt.localeCompare(a.sharedAt))
  })
}

/** Quand il n'y a plus de note non lue sur cet enfant, la notification « note reçue » correspondante est lue aussi. */
function syncNoteNotifications(userId: string, childId: string) {
  const stillUnread = db().sessions.some(
    (s) => s.childId === childId && s.sharedNote?.recipients.some((r) => r.userId === userId && !r.readAt),
  )
  if (stillUnread) return
  const now = nowISO()
  db().notifications.forEach((n) => {
    if (n.userId === userId && n.childId === childId && n.kind === "note_recue" && !n.readAt) n.readAt = now
  })
}

/** Ouvrir une note la marque comme lue pour ce lecteur seulement (chaque destinataire a son propre état). */
export function markNoteRead(sessionId: string): Promise<void> {
  return simulate(() => {
    const me = requireUser()
    const s = db().sessions.find((x) => x.id === sessionId)
    const mine = s?.sharedNote?.recipients.find((r) => r.userId === me.id)
    if (!s || !mine) throw new ApiError("not_found")
    if (!mine.readAt) {
      mine.readAt = nowISO()
      syncNoteNotifications(me.id, s.childId)
      persist()
    }
  })
}

/** « Tout marquer comme lu » pour un enfant. */
export function markAllNotesRead(childId: string): Promise<void> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    const now = nowISO()
    db().sessions.forEach((s) => {
      if (s.childId !== childId) return
      const mine = s.sharedNote?.recipients.find((r) => r.userId === me.id)
      if (mine && !mine.readAt) mine.readAt = now
    })
    syncNoteNotifications(me.id, childId)
    persist()
  })
}
