import type { Roadmap, RoadmapContentMap, RoadmapPartKey, RoadmapSource } from "@/types"
import { get, post, put, seg } from "./client"

const base = (childId: string) => `/children/${seg(childId)}/roadmap`

/** Roadmap commune : lisible par toute l'équipe assignée et par le directeur. */
export function getRoadmap(childId: string): Promise<Roadmap> {
  return get<Roadmap>(base(childId))
}

/**
 * « Mettre à jour la roadmap ». L'IA tourne côté serveur (backend/cdis/ai/provider.py) : elle ne reçoit que les
 * notes pour l'IA, la roadmap validée et le statut des aides ; chaque responsable valide ensuite sa partie.
 */
export function generateRoadmapProposal(childId: string): Promise<{ roadmap: Roadmap; proposedParts: RoadmapPartKey[] }> {
  return post(`${base(childId)}/proposals`)
}

/** @deprecated garder `generateRoadmapProposal` */
export const requestRoadmapUpdate = generateRoadmapProposal

/** Sources citées par les propositions : texte de la note pour l'IA SEULEMENT pour son auteur. */
export function getRoadmapSources(childId: string): Promise<RoadmapSource[]> {
  return get<RoadmapSource[]>(`${base(childId)}/sources`)
}

/** Le responsable valide (tel quel ou modifié). Justification obligatoire s'il modifie. */
export function validateRoadmapPart<K extends RoadmapPartKey>(
  childId: string,
  key: K,
  options: { modifiedContent?: RoadmapContentMap[K]; justification?: string } = {},
): Promise<Roadmap> {
  return post<Roadmap>(`${base(childId)}/parts/${key}/validate`, options)
}

/** Le responsable rejette ; justification obligatoire. La version précédente reste affichée. */
export function rejectRoadmapPart(childId: string, key: RoadmapPartKey, justification: string): Promise<Roadmap> {
  return post<Roadmap>(`${base(childId)}/parts/${key}/reject`, { justification })
}

/** Les autres intervenants peuvent commenter une proposition, sans la valider. */
export function commentRoadmapProposal(childId: string, key: RoadmapPartKey, text: string): Promise<Roadmap> {
  return post<Roadmap>(`${base(childId)}/parts/${key}/comments`, { text })
}

/** Objectif principal et piste retenue (équipe d'intervenants). */
export function updateRoadmapGoal(childId: string, goal: Pick<Roadmap, "objective" | "careerTrack" | "progressPercent">): Promise<Roadmap> {
  return put<Roadmap>(`${base(childId)}/goal`, goal)
}
