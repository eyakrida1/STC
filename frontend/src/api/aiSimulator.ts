/**
 * IA SIMULÉE (déterministe) — à remplacer par l'appel au backend (LLM) dans `generateRoadmapProposal`.
 * Elle ne reçoit que ce que le cahier des charges autorise : les notes « pour l'IA », la roadmap validée,
 * les aides en cours. Jamais : nom, photo, CIN, adresse, notes privées ou partagées, Santé / Judiciaire.
 * Les règles ci-dessous imitent une rédaction plausible pour la démo : on lit des mots-clés, on propose
 * quelques ajouts / retraits, et chaque changement cite la note qui le justifie.
 */
import { addDays, localISODate } from "@/lib/format"
import type {
  AidApplication,
  AidProgram,
  EducationContent,
  MoodLevel,
  PsychologicalContent,
  RoadmapChange,
  Session,
  SocialContent,
} from "@/types"

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

const POSITIVE = /(a l'aise|progres|mieux|reussi|ponctuel|applique|motiv|hausse|en baisse|amelior|confian|positif|soutien|obtenu|accorde|investi)/
const NEGATIVE = /(difficult|perd |fragile|tendu|echec|mal dor|inadapte|precaire|conflit)/

/** Premier morceau de phrase, propre et court. */
function clause(text: string, index = 0): string | null {
  const parts = text
    .split(/[;.,]/)
    .map((p) => p.trim())
    .filter(Boolean)
  const p = parts[index]
  if (!p) return null
  const c = p.charAt(0).toUpperCase() + p.slice(1)
  return c.length > 90 ? `${c.slice(0, 87)}…` : c
}

/** Mots-clés → compétences de jauge. */
const SKILL_WORDS: [RegExp, RegExp][] = [
  [/lecture/, /(lecture|lire|notice)/],
  [/calcul/, /(calcul|proportion|math)/],
  [/ponctu/, /ponctu/],
  [/equipe/, /(equipe|camarade|groupe)/],
  [/patience/, /patien/],
]

type Draft<T> = { content: T; changes: RoadmapChange[] }

const due = (days: number) => addDays(localISODate(), days)

export function draftEducation(current: EducationContent, notes: Session[]): Draft<EducationContent> | null {
  const c = structuredClone(current)
  const changes: RoadmapChange[] = []
  for (const s of notes) {
    const text = s.aiNote!.text
    const n = norm(text)
    const positive = POSITIVE.test(n)
    // 1. jauges : une compétence citée positivement gagne un niveau
    for (const g of c.skillGauges) {
      const words = SKILL_WORDS.find(([k]) => k.test(norm(g.skill)))?.[1]
      if (!words || !words.test(n)) continue
      const negativeHere = NEGATIVE.test(n) && /perd|difficult/.test(n.slice(Math.max(0, n.search(words) - 25), n.search(words) + 20))
      if (positive && !negativeHere && g.level < 5) {
        changes.push({ field: "skillGauges", summary: `${g.skill} : ${g.level} → ${g.level + 1}`, sourceSessionIds: [s.id] })
        g.level = (g.level + 1) as MoodLevel
      }
    }
    // 2. compétence acquise : le premier morceau d'une note positive
    const first = clause(text)
    if (positive && first && !c.acquiredSkills.includes(first)) {
      c.acquiredSkills = [...c.acquiredSkills, first]
      changes.push({ field: "acquiredSkills", summary: first, sourceSessionIds: [s.id] })
    }
    // 3. une difficulté citée devient un prochain pas
    const second = clause(text, 1)
    if (second && NEGATIVE.test(norm(second))) {
      const label = `Accompagner : ${second.charAt(0).toLowerCase()}${second.slice(1)}`
      c.nextSteps = [...c.nextSteps, { label, dueDate: due(30) }]
      changes.push({ field: "nextSteps", summary: label, sourceSessionIds: [s.id] })
    }
  }
  // 4. un prochain pas dont l'échéance est passée est retiré (il a été traité ou doit être reformulé)
  const today = localISODate()
  const overdue = c.nextSteps.filter((x) => x.dueDate < today)
  if (overdue.length && changes.length) {
    c.nextSteps = c.nextSteps.filter((x) => x.dueDate >= today)
    overdue.forEach((x) => changes.push({ field: "nextSteps", summary: `Retiré : ${x.label}`, sourceSessionIds: changes[0].sourceSessionIds }))
  }
  return changes.length ? { content: c, changes } : null
}

export function draftPsychological(current: PsychologicalContent, notes: Session[]): Draft<PsychologicalContent> | null {
  const c = structuredClone(current)
  const changes: RoadmapChange[] = []
  for (const s of notes) {
    const text = s.aiNote!.text
    const n = norm(text)
    const first = clause(text)
    if (!first) continue
    if (POSITIVE.test(n) && s.authorRole === "psychologue" && !c.progress.includes(first)) {
      c.progress = [...c.progress, first]
      changes.push({ field: "progress", summary: first, sourceSessionIds: [s.id] })
      // un axe de travail clairement amélioré est retiré
      const solved = c.toWork.find((axis) => {
        const key = norm(axis).split(" ")[0]
        return key.length > 4 && n.includes(key) && /(hausse|amelior|en baisse|mieux)/.test(n)
      })
      if (solved) {
        c.toWork = c.toWork.filter((a) => a !== solved)
        changes.push({ field: "toWork", summary: `Retiré : ${solved}`, sourceSessionIds: [s.id] })
      }
    }
    if (NEGATIVE.test(n) && /(colere|anxi|confian|patien|fatig|echec)/.test(n)) {
      const axis = (clause(text, 1) ?? first).replace(/^./, (x) => x.toUpperCase())
      if (!c.toWork.includes(axis)) {
        c.toWork = [...c.toWork, axis]
        changes.push({ field: "toWork", summary: axis, sourceSessionIds: [s.id] })
      }
    }
    if (s.authorRole === "educateur" && POSITIVE.test(n)) {
      const trait = /manuel/.test(n) ? "Habile de ses mains" : /aide|camarade/.test(n) ? "Entraide avec les autres" : null
      if (trait && !c.character.includes(trait)) {
        c.character = [...c.character, trait]
        changes.push({ field: "character", summary: trait, sourceSessionIds: [s.id] })
      }
    }
  }
  return changes.length ? { content: c, changes } : null
}

const AID_STATUS_TEXT: Record<AidApplication["status"], string> = {
  a_preparer: "à préparer",
  depose: "déposée",
  accorde: "accordée",
  refuse: "refusée",
}

export function draftSocial(
  current: SocialContent,
  notes: Session[],
  aids: AidApplication[],
  programs: AidProgram[],
): Draft<SocialContent> | null {
  const c = structuredClone(current)
  const changes: RoadmapChange[] = []
  const src = notes.map((s) => s.id)
  // aides en cours : recalculées depuis le suivi réel des dossiers d'aide
  const live = aids.map((a) => `${programs.find((p) => p.id === a.programId)?.label ?? a.programId} : ${AID_STATUS_TEXT[a.status]}`)
  const added = live.filter((x) => !c.aidsSummary.includes(x))
  const removed = c.aidsSummary.filter((x) => !live.includes(x))
  if ((added.length || removed.length) && src.length) {
    c.aidsSummary = live
    removed.forEach((x) => changes.push({ field: "aidsSummary", summary: `Retiré : ${x}`, sourceSessionIds: src }))
    added.forEach((x) => changes.push({ field: "aidsSummary", summary: x, sourceSessionIds: src }))
  }
  for (const s of notes) {
    const first = clause(s.aiNote!.text)
    if (!first) continue
    const label = `Faire le point avec la famille : ${first.charAt(0).toLowerCase()}${first.slice(1)}`
    if (!c.nextSteps.some((x) => x.label === label)) {
      c.nextSteps = [...c.nextSteps, { label, dueDate: due(21) }]
      changes.push({ field: "nextSteps", summary: label, sourceSessionIds: [s.id] })
    }
  }
  return changes.length ? { content: c, changes } : null
}
