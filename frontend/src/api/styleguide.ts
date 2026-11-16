// Exemples affichés par /styleguide (page publique) : lus dans mocks/donnees.ts, comme toutes les données.
import { exemplesStyleguide } from "@/mocks/donnees"
import { simulate } from "./client"

export type StyleguideExamples = ReturnType<typeof exemplesStyleguide>

export function getStyleguideExamples(): Promise<StyleguideExamples> {
  return simulate(() => exemplesStyleguide())
}
