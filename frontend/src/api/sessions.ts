import { AI_AUTO_UPDATE_THRESHOLD, isProfessional, SESSION_EDIT_WINDOW_MS } from "@/lib/access"
import type { NewSession, ProfessionalRole, ReceivedNote, Session, SessionKind } from "@/types"
import { ApiError, db, newId, nowISO, persist, requireChild, requireUser, simulate } from "./client"
import { notify } from "./notifications"
import { generateProposalSync, pendingAiNoteCount } from "./roadmap"

/** Chaque rôle a son type de séance (même formulaire à 3 sorties). */
export const SESSION_KIND_BY_ROLE: Record<ProfessionalRole, SessionKind> = {
  psychologue: "consultation",
  social: "visite",
  educateur: "observation",
}

/** Mes séances sur un enfant (l'auteur seul voit ses séances complètes). */
export function listMySessions(childId: string): Promise<Session[]> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!isProfessional(me.role)) throw new ApiError("forbidden")
    return db()
      .sessions.filter((s) => s.childId === childId && s.authorId === me.id)
      .sort((a, b) => b.date.localeCompare(a.date))
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

/** Enregistre une séance ; notifie les destinataires ; met à jour l'humeur si consultation ; déclenche l'IA au seuil. */
export function createSession(input: NewSession): Promise<Session> {
  return simulate(() => {
    const me = requireUser()
    if (!isProfessional(me.role)) throw new ApiError("forbidden")
    const child = requireChild(me, input.childId)
    if (input.details.kind !== SESSION_KIND_BY_ROLE[me.role]) throw new ApiError("invalid")

    const team = Object.values(child.assigned)
    const recipients = (input.sharedNote?.recipientIds ?? []).filter((id) => id !== me.id && team.includes(id))
    const now = nowISO()
    const clean = (v: string | null) => (v && v.trim() ? v.trim() : null)
    const sharedText = clean(input.sharedNote?.text ?? null)
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

    // Seule l'humeur générale est partagée (elle anime l'avatar) ; les autres échelles restent chez le psy.
    if (session.details.kind === "consultation") {
      const level = session.details.scales.humeur
      child.mood.level = level
      child.mood.updatedAt = now
      child.mood.updatedBy = me.id
      child.mood.history.push({ date: session.date, level })
    }

    if (aiText && pendingAiNoteCount(child.id) >= AI_AUTO_UPDATE_THRESHOLD) {
      generateProposalSync(child.id, "auto", null)
    }

    persist()
    return session
  })
}

/** Correction par l'auteur pendant 24 h. Une note ne se supprime jamais. */
export function updateMySession(
  sessionId: string,
  patch: Partial<Pick<Session, "privateNote" | "details">> & { sharedText?: string; aiText?: string },
): Promise<Session> {
  return simulate(() => {
    const me = requireUser()
    const s = db().sessions.find((x) => x.id === sessionId)
    if (!s) throw new ApiError("not_found")
    if (s.authorId !== me.id) throw new ApiError("forbidden")
    if (Date.now() - new Date(s.createdAt).getTime() > SESSION_EDIT_WINDOW_MS) throw new ApiError("conflict")
    if (patch.privateNote !== undefined) s.privateNote = patch.privateNote
    if (patch.details && patch.details.kind === s.details.kind) s.details = patch.details
    if (patch.sharedText !== undefined && s.sharedNote) s.sharedNote.text = patch.sharedText
    if (patch.aiText !== undefined && s.aiNote && !s.aiNote.consumedByProposalId) s.aiNote.text = patch.aiText
    s.updatedAt = nowISO()
    persist()
    return s
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

/** Ouvrir une note la marque comme lue pour ce lecteur seulement. */
export function markNoteRead(sessionId: string): Promise<void> {
  return simulate(() => {
    const me = requireUser()
    const s = db().sessions.find((x) => x.id === sessionId)
    const mine = s?.sharedNote?.recipients.find((r) => r.userId === me.id)
    if (!mine) throw new ApiError("not_found")
    if (!mine.readAt) {
      mine.readAt = nowISO()
      persist()
    }
  })
}
