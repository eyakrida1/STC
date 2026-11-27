// Exemples affichés par /styleguide (page publique) : servis par le backend, comme toutes les données de démo.
import type { ProfessionalRole, RoadmapPartKey, Sex, Interests, ISODate, ISODateTime } from "@/types"
import { get } from "./client"

export interface StyleguideExamples {
  enfant: { seed: string; name: string; sex: Sex }
  intervenant: { seed: string; name: string }
  enTete: { title: string; description: string }
  carteScolarite: { lastSchool: string; nominal: string; actual: string; health: string }
  chiffres: { followed: string; insertion: string; returned: string; pending: string; followedTrend: string; insertionTrendPts: number }
  notes: { author: string; authorSeed: string; role: ProfessionalRole; text: string; session: string; sharedAt: ISODateTime }[]
  humeurs: { seed: string; sex: Sex }[]
  avatarVivant: { seed: string; name: string; sex: Sex; interests: Interests }
  route: {
    entryDate: ISODate
    returnDate: ISODate
    flags: { part: RoadmapPartKey; label: string; date: ISODate; reached: boolean }[]
  }
}

export function getStyleguideExamples(): Promise<StyleguideExamples> {
  return get<StyleguideExamples>("/styleguide")
}
