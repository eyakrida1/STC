import { addDays, localISODate } from "@/lib/format"
import { canRequestRoadmapUpdate, canValidateRoadmapPart, ROADMAP_OWNERS } from "@/lib/access"
import type {
  ProfessionalRole,
  Roadmap,
  RoadmapChange,
  RoadmapContentMap,
  RoadmapPart,
  RoadmapPartKey,
  RoadmapProposal,
  Session,
} from "@/types"
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

// ───────────────────────────── IA simulée
// Remplacée plus tard par le backend (LLM). Ne reçoit que les notes « pour l'IA », jamais les notes privées
// ni les blocs Santé / Situation judiciaire.
const PART_SOURCES: Record<RoadmapPartKey, ProfessionalRole[]> = {
  education: ["educateur", "psychologue"],
  psychologique: ["psychologue", "educateur"],
  sociale: ["social"],
}

function draftPart<K extends RoadmapPartKey>(
  key: K,
  current: RoadmapContentMap[K],
  notes: Session[],
): { content: RoadmapContentMap[K]; changes: RoadmapChange[] } | null {
  const relevant = notes.filter((s) => PART_SOURCES[key].includes(s.authorRole))
  if (!relevant.length) return null // partie inchangée : pas reproposée
  const content = structuredClone(current)
  const changes: RoadmapChange[] = []
  const due = addDays(localISODate(), 21)
  for (const s of relevant) {
    const text = s.aiNote!.text
    if (key === "education") {
      const c = content as RoadmapContentMap["education"]
      c.currentActivities = [...c.currentActivities, text]
      changes.push({ field: "currentActivities", summary: text, sourceSessionIds: [s.id] })
    } else if (key === "psychologique") {
      const c = content as RoadmapContentMap["psychologique"]
      c.progress = [...c.progress, text]
      changes.push({ field: "progress", summary: text, sourceSessionIds: [s.id] })
    } else {
      const c = content as RoadmapContentMap["sociale"]
      c.nextSteps = [...c.nextSteps, { label: text, dueDate: due }]
      changes.push({ field: "nextSteps", summary: text, sourceSessionIds: [s.id] })
    }
  }
  return { content, changes }
}

/** Usage interne : génère une proposition partie par partie à partir des notes pour l'IA non utilisées. */
export function generateProposalSync(childId: string, trigger: "demande" | "auto", requestedBy: string | null): Roadmap {
  const data = db()
  const roadmap = data.roadmaps.find((r) => r.childId === childId)
  const child = data.children.find((c) => c.id === childId)
  if (!roadmap || !child) throw new ApiError("not_found")
  const notes = data.sessions.filter((s) => s.childId === childId && s.aiNote && !s.aiNote.consumedByProposalId)

  const build = <K extends RoadmapPartKey>(key: K) => {
    const part = roadmap.parts[key] as RoadmapPart<RoadmapContentMap[K]>
    const base = part.pending?.content ?? part.validated.content
    const draft = draftPart(key, base, notes)
    if (!draft) return
    const proposal: RoadmapProposal<RoadmapContentMap[K]> = {
      id: newId("pr"),
      createdAt: nowISO(),
      trigger,
      requestedBy,
      content: draft.content,
      changes: [...(part.pending?.changes ?? []), ...draft.changes],
      comments: part.pending?.comments ?? [],
    }
    part.pending = proposal
    const used = new Set(draft.changes.flatMap((c) => c.sourceSessionIds))
    for (const s of notes) {
      if (used.has(s.id) && !s.aiNote!.consumedByProposalId) s.aiNote!.consumedByProposalId = proposal.id
    }
    notify(child.assigned[ROADMAP_OWNERS[key]], "validation_attendue", childId)
  }
  build("education")
  build("psychologique")
  build("sociale")
  persist()
  return roadmap
}

/** « Mettre à jour la roadmap » — n'importe quel intervenant. */
export function requestRoadmapUpdate(childId: string): Promise<Roadmap> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!canRequestRoadmapUpdate(me.role)) throw new ApiError("forbidden")
    return generateProposalSync(childId, "demande", me.id)
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
    requireChild(me, childId)
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
