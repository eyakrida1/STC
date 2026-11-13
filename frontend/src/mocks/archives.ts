// Données FICTIVES : dossiers clos (séjours terminés, anonymisés) du CDIS Tunis sur les 18 derniers mois.
// Ils n'apparaissent dans aucune liste d'enfants : ils servent seulement au tableau de bord du directeur.
import type { ClosedStay, ExitDestination } from "@/types"
import { daysAgo } from "./dates"

const spec: [entryDaysAgo: number, exitDaysAgo: number, destination: ExitDestination][] = [
  [520, 300, "formation"],
  [500, 260, "famille"],
  [480, 230, "ecole"],
  [430, 200, "emploi"],
  [400, 170, "abandon"],
  [380, 140, "formation"],
  [340, 120, "ecole"],
  [300, 95, "autre_structure"],
  [290, 70, "formation"],
  [260, 50, "emploi"],
  [230, 25, "ecole"],
  [200, 12, "formation"],
  [180, 6, "famille"],
]

export function buildArchives(): ClosedStay[] {
  return spec.map(([e, x, dest], i) => ({
    id: `arch-${i + 1}`,
    poleId: "pole-tunis",
    entryDate: daysAgo(e),
    exitDate: daysAgo(x),
    exitDestination: dest,
  }))
}
