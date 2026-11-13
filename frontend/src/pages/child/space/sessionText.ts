import type { Dictionary } from "@/i18n/fr"
import type { Session } from "@/types"

/** « Suivi · 45 min », « Domicile », « Atelier électricité · 90 min ». */
export function sessionMeta(s: Session, t: Dictionary): string {
  const d = s.details
  if (d.kind === "consultation") return `${t.sessions.consultationTypes[d.type]} · ${t.sessions.minutes(d.durationMin)}`
  if (d.kind === "visite") return t.sessions.visitLocations[d.location]
  return d.durationMin ? `${d.context} · ${t.sessions.minutes(d.durationMin)}` : d.context
}

/** Première ligne de la note la plus parlante (partagée, sinon privée, sinon IA). */
export function sessionFirstLine(s: Session): string | null {
  const text = s.sharedNote?.text ?? s.privateNote ?? s.aiNote?.text ?? null
  return text ? text.split("\n")[0] : null
}
