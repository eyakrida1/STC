import { allowedPhaseTargets, AUDITED_BLOCKS, canEditBlock, canEditPhase, isProfessional, PRO_ROLES } from "@/lib/access"
import { addDays, ageFrom, localISODate } from "@/lib/format"
import type { Child, ChildBlock, ChildSummary, PhaseId, ProfessionalRole, User } from "@/types"
import { ApiError, canSeeChild, db, newId, nowISO, persist, requireChild, requireUser, simulate } from "./client"

function summarize(child: Child, me: User): ChildSummary {
  const data = db()
  const unreadNotes = isProfessional(me.role)
    ? data.sessions.filter(
        (s) =>
          s.childId === child.id &&
          s.sharedNote?.recipients.some((r) => r.userId === me.id && r.readAt === null),
      ).length
    : 0
  const roadmap = data.roadmaps.find((r) => r.childId === child.id)
  const pendingValidation =
    !!roadmap && Object.values(roadmap.parts).some((p) => p.owner === me.role && p.pending !== null)
  const weekAgo = addDays(localISODate(), -7)
  const recentAbsences = data.attendance.filter(
    (a) => a.childId === child.id && a.status === "absent" && a.date >= weekAgo,
  ).length

  return {
    id: child.id,
    code: child.code,
    firstName: child.identity.firstName,
    lastName: child.identity.lastName,
    age: ageFrom(child.identity.birthDate),
    sex: child.identity.sex,
    avatarSeed: child.identity.avatarSeed,
    phase: child.journey.phase,
    status: child.journey.status,
    mood: child.mood.level,
    moodUpdatedAt: child.mood.updatedAt,
    unreadNotes,
    pendingValidation,
    recentAbsences,
    returned: child.journey.stays.length > 1,
    lastActivityAt:
      data.sessions
        .filter((s) => s.childId === child.id)
        .map((s) => s.createdAt)
        .sort()
        .at(-1) ?? null,
  }
}

/** Mes enfants : intervenant → enfants assignés uniquement ; directeur → tous les enfants du pôle. */
export function listChildren(): Promise<ChildSummary[]> {
  return simulate(() => {
    const me = requireUser()
    return db()
      .children.filter((c) => canSeeChild(me, c))
      .map((c) => summarize(c, me))
  })
}

/** Partie commune du dossier. Le directeur la lit (lecture seule). */
export function getChild(childId: string): Promise<Child> {
  return simulate(() => requireChild(requireUser(), childId))
}

/** À appeler à l'ouverture des blocs Santé et Situation judiciaire (journal d'audit). */
export function logBlockOpened(childId: string, block: ChildBlock): Promise<void> {
  return simulate(() => {
    const me = requireUser()
    requireChild(me, childId)
    if (!AUDITED_BLOCKS.includes(block)) return
    db().audit.push({
      id: newId("audit"),
      userId: me.id,
      childId,
      action: block === "health" ? "ouverture_sante" : "ouverture_judiciaire",
      at: nowISO(),
    })
    persist()
  })
}

/** Modifie un bloc de la partie commune ; seul son propriétaire en a le droit. */
export function updateChildBlock<K extends Exclude<ChildBlock, "mood">>(
  childId: string,
  block: K,
  value: Child[K],
): Promise<Child> {
  return simulate(() => {
    const me = requireUser()
    const child = requireChild(me, childId)
    if (!canEditBlock(me.role, block)) throw new ApiError("forbidden")
    child[block] = value
    persist()
    return child
  })
}

/** Changement de phase du parcours : toute l'équipe d'intervenants. */
export function setPhase(childId: string, phase: PhaseId, comment: string): Promise<Child> {
  return simulate(() => {
    const me = requireUser()
    const child = requireChild(me, childId)
    if (!canEditPhase(me.role)) throw new ApiError("forbidden")
    if (!allowedPhaseTargets(child.journey.phase).includes(phase)) throw new ApiError("invalid")
    if (!comment.trim()) throw new ApiError("invalid")
    const stayId = child.journey.stays.at(-1)!.id
    child.journey.phase = phase
    child.journey.phaseHistory.push({ phase, enteredAt: localISODate(), stayId, by: me.id, comment: comment.trim() })
    persist()
    return child
  })
}

/** Équipe qui suit l'enfant (noms, rôles, photos) — pour l'en-tête du dossier. */
export function getChildTeam(childId: string): Promise<{ id: string; firstName: string; lastName: string; role: ProfessionalRole; avatarSeed: string; photoUrl: string | null }[]> {
  return simulate(() => {
    const child = requireChild(requireUser(), childId)
    return PRO_ROLES.flatMap((role) => {
      const u = db().users.find((x) => x.id === child.assigned[role])
      return u ? [{ id: u.id, firstName: u.firstName, lastName: u.lastName, role, avatarSeed: u.avatarSeed, photoUrl: u.photoUrl ?? null }] : []
    })
  })
}
