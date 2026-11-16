// Comparaison « version validée → proposition » d'une partie de roadmap, rubrique par rubrique.
// Chaque élément est affiché comme une chaîne ; la clé `${champ}::${texte}` sert aux choix de « Modifier ».
import type { RoadmapContentMap, RoadmapPartKey } from "@/types"

export type DiffStatus = "kept" | "added" | "removed"

export interface DiffItem {
  key: string
  text: string
  raw: unknown
  status: DiffStatus
}

export interface FieldDiff {
  field: string
  scalar: boolean
  items: DiffItem[]
  changed: boolean
}

type Render = (raw: never) => string
interface FieldDesc {
  field: string
  scalar?: boolean
  render: Render
}

/** Rubriques comparées par partie (le reste du contenu est recopié tel quel). */
export function fieldsFor(part: RoadmapPartKey, fmtDate: (d: string) => string): FieldDesc[] {
  const s = (x: string) => x
  const step = (x: { label: string; dueDate: string }) => `${x.label} (${fmtDate(x.dueDate)})`
  if (part === "education")
    return [
      { field: "levelNow", scalar: true, render: s as Render },
      { field: "skillGauges", render: ((g: { skill: string; level: number }) => `${g.skill} : ${g.level}/5`) as Render },
      { field: "acquiredSkills", render: s as Render },
      { field: "currentActivities", render: s as Render },
      { field: "milestones", render: ((m: { date: string; label: string }) => `${fmtDate(m.date)} · ${m.label}`) as Render },
      { field: "nextSteps", render: step as Render },
      { field: "careerTracks", render: ((c: { title: string; reason: string }) => `${c.title} — ${c.reason}`) as Render },
    ]
  if (part === "psychologique")
    return [
      { field: "profile", scalar: true, render: s as Render },
      { field: "character", render: s as Render },
      { field: "progress", render: s as Render },
      { field: "toWork", render: s as Render },
      { field: "nextSteps", render: step as Render },
    ]
  return [
    { field: "familySummary", scalar: true, render: s as Render },
    { field: "aidsSummary", render: s as Render },
    { field: "nextSteps", render: step as Render },
  ]
}

export function diffPart<K extends RoadmapPartKey>(
  part: K,
  before: RoadmapContentMap[K],
  after: RoadmapContentMap[K],
  fmtDate: (d: string) => string,
): FieldDiff[] {
  return fieldsFor(part, fmtDate).map(({ field, scalar, render }) => {
    const toList = (c: RoadmapContentMap[K]) => {
      const v = (c as unknown as Record<string, unknown>)[field]
      return (scalar ? [v] : (v as unknown[])).filter((x) => x !== null && x !== undefined && x !== "")
    }
    const old = toList(before).map((raw) => ({ raw, text: render(raw as never) }))
    const neu = toList(after).map((raw) => ({ raw, text: render(raw as never) }))
    const oldTexts = new Set(old.map((o) => o.text))
    const newTexts = new Set(neu.map((o) => o.text))
    const items: DiffItem[] = [
      ...neu.map((n) => ({ key: `${field}::${n.text}`, text: n.text, raw: n.raw, status: (oldTexts.has(n.text) ? "kept" : "added") as DiffStatus })),
      ...old.filter((o) => !newTexts.has(o.text)).map((o) => ({ key: `${field}::${o.text}`, text: o.text, raw: o.raw, status: "removed" as DiffStatus })),
    ]
    // regroupe chaque retrait avec l'ajout qui le remplace (même début de libellé)
    const head = (s: string) => s.split(/ : | \(| — /)[0]
    const ordered: DiffItem[] = items.filter((i) => i.status !== "removed")
    for (const r of items.filter((i) => i.status === "removed")) {
      const at = ordered.findIndex((i) => i.status === "added" && head(i.text) === head(r.text))
      if (at >= 0) ordered.splice(at, 0, r)
      else ordered.push(r)
    }
    return { field, scalar: !!scalar, items: ordered, changed: ordered.some((i) => i.status !== "kept") }
  })
}

/**
 * « Modifier » : part de la proposition et annule les changements décochés
 * (un ajout décoché disparaît, un retrait décoché est conservé).
 */
export function applyChoices<K extends RoadmapPartKey>(
  part: K,
  before: RoadmapContentMap[K],
  after: RoadmapContentMap[K],
  declined: Set<string>,
  fmtDate: (d: string) => string,
): RoadmapContentMap[K] {
  const result = structuredClone(after) as unknown as Record<string, unknown>
  for (const d of diffPart(part, before, after, fmtDate)) {
    const keep = d.items.filter(
      (i) => i.status === "kept" || (i.status === "added" && !declined.has(i.key)) || (i.status === "removed" && declined.has(i.key)),
    )
    if (d.scalar) {
      // texte : si le nouveau est décoché, on garde l'ancien
      const chosen = keep.find((i) => i.status !== "removed") ?? keep[0]
      result[d.field] = chosen ? chosen.raw : (before as unknown as Record<string, unknown>)[d.field]
    } else {
      result[d.field] = keep.map((i) => structuredClone(i.raw))
    }
  }
  return result as unknown as RoadmapContentMap[K]
}
