import { canRequestRoadmapUpdate, canValidateRoadmapPart, isProfessional, ROADMAP_OWNERS } from "@/lib/access"
import type {
  ProfessionalRole,
  Roadmap,
  RoadmapContentMap,
  RoadmapPart,
  RoadmapPartKey,
  RoadmapProposal,
  RoadmapSource,
  SessionKind,
} from "@/types"
import { draftEducation, draftPsychological, draftSocial } from "./aiSimulator"
import { ApiError, db, newId, nowISO, persist, requireChild, requireUser, simulate } from "./client"
import { notify } from "./notifications"

/** Roadmap commune : lisible par toute l'équipe assignée et par le directeur. */
export function getRoadmap(childId: string): Promise<Roadmap> {
  return simulate(() => {
    requireChild(requireUser(), childId)
    const r = db().roadmaps.find((x) => x.childId === childId)
    if (!r) throw new ApiError("not_found")
    return r
  })
}

/** Nombre de notes pour l'IA pas encore utilisées (seuil de mise à jour automatique). */
export function pendingAiNoteCount(childId: string): number {
  return db().sessions.filter((s) => s.childId === childId && s.aiNote && !s.aiNote.consumedByProposalId).length
}

/** Quelles notes nourrissent quelle partie. */
const PART_SOURCES: Record<RoadmapPartKey, ProfessionalRole[]> = {
  education: ["educateur", "psychologue"],
  psychologique: ["psychologue", "educateur"],
  sociale: ["social"],
}

/**
 * Usage interne : produit une proposition partie par partie à partir des notes pour l'IA non utilisées.
 * Une partie dont les données n'ont pas changé n'est pas reproposée. Renvoie les parties proposées.
 */
export function generateProposalSync(childId: string, trigger: "demande" | "auto", requestedBy: string | null): RoadmapPartKey[] {
  const data = db()
  const roadmap = data.roadmaps.find((r) => r.childId === childId)
  const child = data.children.find((c) => c.id === childId)
  if (!roadmap || !child) throw new ApiError("not_found")
  const notes = data.sessions.filter((s) => s.childId === childId && s.aiNote && !s.aiNote.consumedByProposalId)
  const aids = data.aidApplications.filter((a) => a.childId === childId)
  const proposed: RoadmapPartKey[] = []

  const propose = <K extends RoadmapPartKey>(key: K, draft: { content: RoadmapContentMap[K]; changes: RoadmapProposal<RoadmapContentMap[K]>["changes"] } | null) => {
    if (!draft) return
    const part = roadmap.parts[key] as RoadmapPart<RoadmapContentMap[K]>
    part.pending = {
      id: newId("pr"),
      createdAt: nowISO(),
      trigger,
      requestedBy,
      content: draft.content,
      changes: [...(part.pending?.changes ?? []), ...draft.changes],
      comments: part.pending?.comments ?? [],
    }
    proposed.push(key)
    notify(child.assigned[ROADMAP_OWNERS[key]], "validation_attendue", childId)
  }

  const sourcesFor = (key: RoadmapPartKey) => notes.filter((s) => PART_SOURCES[key].includes(s.authorRole))
  const base = <K extends RoadmapPartKey>(key: K) =>
    (roadmap.parts[key].pending?.content ?? roadmap.parts[key].validated.content) as RoadmapContentMap[K]

  propose("education", draftEducation(base("education"), sourcesFor("education")))
  propose("psychologique", draftPsychological(base("psychologique"), sourcesFor("psychologique")))
  propose("sociale", draftSocial(base("sociale"), sourcesFor("sociale"), aids, data.aidPrograms))

  // les notes lues par l'IA sont consommées (elles ne comptent plus pour le seuil de 5)
  const stamp = newId("gen")
  notes.forEach((s) => {
    s.aiNote!.consumedByProposalId = stamp
  })
  persist()
  return proposed
}

/**
 * « Mettre à jour la roadmap ». Point de branchement de la future IA : aujourd'hui une simulation déterministe
 * avec une latence réaliste (~2 s) ; demain un appel au backend Django (même signature).
 */
export async function generateRoadmapProposal(
  childId: string,
): Promise<{ roadmap: Roadmap; proposedParts: RoadmapPartKey[] }> {
  await new Promise((r) => setTimeout(r, 1700)) // l'IA « rédige »
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!canRequestRoadmapUpdate(me.role)) throw new ApiError("forbidden")
    const proposedParts = generateProposalSync(childId, "demande", me.id)
    return { roadmap: db().roadmaps.find((r) => r.childId === childId)!, proposedParts }
  })
}

/** @deprecated garder `generateRoadmapProposal` */
export const requestRoadmapUpdate = generateRoadmapProposal

/**
 * Sources citées par les propositions : métadonnées pour tous (rôle, date, type de séance),
 * texte de la note pour l'IA SEULEMENT pour son auteur (personne d'autre ne lit ces notes).
 */
export function getRoadmapSources(childId: string): Promise<RoadmapSource[]> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    const users = db().users
    return db()
      .sessions.filter((s) => s.childId === childId && s.aiNote)
      .map((s) => {
        const author = users.find((u) => u.id === s.authorId)
        return {
          sessionId: s.id,
          authorRole: s.authorRole,
          authorName: author ? `${author.firstName} ${author.lastName}` : "",
          sessionKind: s.details.kind as SessionKind,
          date: s.date,
          text: isProfessional(me.role) && s.authorId === me.id ? s.aiNote!.text : null,
        }
      })
  })
}

function closeValidationNotifications(userId: string, childId: string) {
  const now = nowISO()
  db().notifications.forEach((n) => {
    if (n.userId === userId && n.childId === childId && n.kind === "validation_attendue" && !n.readAt) n.readAt = now
  })
}

/** Le responsable valide (tel quel ou modifié). Justification obligatoire s'il modifie. */
export function validateRoadmapPart<K extends RoadmapPartKey>(
  childId: string,
  key: K,
  options: { modifiedContent?: RoadmapContentMap[K]; justification?: string } = {},
): Promise<Roadmap> {
  return simulate(() => {
    const me = requireUser()
    const child = requireChild(me, childId)
    if (!canValidateRoadmapPart(me.role, key)) throw new ApiError("forbidden")
    const roadmap = db().roadmaps.find((r) => r.childId === childId)!
    const part = roadmap.parts[key] as RoadmapPart<RoadmapContentMap[K]>
    if (!part.pending) throw new ApiError("conflict")
    const modified = options.modifiedContent !== undefined
    if (modified && !options.justification?.trim()) throw new ApiError("invalid")
    const version = {
      version: part.validated.version + 1,
      content: options.modifiedContent ?? part.pending.content,
      validatedAt: nowISO(),
      validatedBy: me.id,
      decision: modified ? ("modifie" as const) : ("valide" as const),
      justification: options.justification?.trim() || null,
    }
    part.validated = version
    part.history.push(version)
    part.pending = null
    roadmap.updatedAt = version.validatedAt
    roadmap.progressPercent = Math.min(100, roadmap.progressPercent + 5)
    if (!Object.values(roadmap.parts).some((p) => p.pending && p.owner === me.role)) closeValidationNotifications(me.id, child.id)
    Object.values(child.assigned)
      .filter((id) => id !== me.id)
      .forEach((id) => notify(id, "roadmap_mise_a_jour", child.id))
    persist()
    return roadmap
  })
}

/** Le responsable rejette ; justification obligatoire. La version précédente reste affichée. */
export function rejectRoadmapPart(childId: string, key: RoadmapPartKey, justification: string): Promise<Roadmap> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!canValidateRoadmapPart(me.role, key)) throw new ApiError("forbidden")
    if (!justification.trim()) throw new ApiError("invalid")
    const roadmap = db().roadmaps.find((r) => r.childId === childId)!
    const part = roadmap.parts[key]
    if (!part.pending) throw new ApiError("conflict")
    part.rejected.push({ proposalId: part.pending.id, by: me.id, at: nowISO(), justification: justification.trim() })
    part.pending = null
    closeValidationNotifications(me.id, childId)
    persist()
    return roadmap
  })
}

/** Les autres intervenants peuvent commenter une proposition, sans la valider. */
export function commentRoadmapProposal(childId: string, key: RoadmapPartKey, text: string): Promise<Roadmap> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!canRequestRoadmapUpdate(me.role)) throw new ApiError("forbidden")
    if (!text.trim()) throw new ApiError("invalid")
    const roadmap = db().roadmaps.find((r) => r.childId === childId)!
    const pending = roadmap.parts[key].pending
    if (!pending) throw new ApiError("conflict")
    pending.comments.push({ id: newId("cm"), authorId: me.id, text: text.trim(), createdAt: nowISO() })
    persist()
    return roadmap
  })
}

/** Objectif principal et piste retenue (équipe d'intervenants). */
export function updateRoadmapGoal(
  childId: string,
  goal: Pick<Roadmap, "objective" | "careerTrack" | "progressPercent">,
): Promise<Roadmap> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!canRequestRoadmapUpdate(me.role)) throw new ApiError("forbidden")
    const roadmap = db().roadmaps.find((r) => r.childId === childId)!
    Object.assign(roadmap, goal, { updatedAt: nowISO() })
    persist()
    return roadmap
  })
}
