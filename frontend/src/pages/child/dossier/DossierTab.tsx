import * as api from "@/api"
import { useCurrentUser } from "@/auth/context"
import { canEditBlock } from "@/lib/access"
import type { Child } from "@/types"
import type { ChildPageData } from "../ChildPage"
import type { BlockProps, EditableBlock } from "./BlockCard"
import { ConsentCard, EconomicCard, FamilyCard, IdentityCard, JourneyCard } from "./adminBlocks"
import { InterestsCard, SchoolingCard } from "./educationBlocks"
import { HealthCard, LegalCard } from "./sensitiveBlocks"

/**
 * Onglet « Dossier » = partie commune. Grille 2 colonnes (1 sur mobile).
 * Chaque bloc a son propriétaire : le bouton « Modifier » n'apparaît que pour lui (lib/access.ts).
 */
export function DossierTab({ data, onChildChange }: { data: ChildPageData; onChildChange: (c: Child) => void }) {
  const user = useCurrentUser()
  const { child } = data

  const onSave: BlockProps["onSave"] = async (block, value) => {
    const updated = await api.updateChildBlock(child.id, block, value)
    onChildChange(updated) // met à jour la carte et, pour les intérêts, les bulles de l'avatar
  }

  const props = (block: EditableBlock): BlockProps => ({ child, canEdit: canEditBlock(user.role, block), onSave })

  return (
    // Ordre de lecture naturel (aussi sur mobile) : les cartes vont par paires sur grand écran.
    <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
      <IdentityCard {...props("identity")} />
      <JourneyCard {...props("journey")} />
      <FamilyCard {...props("family")} />
      <EconomicCard {...props("economic")} aids={data.aids} programs={data.programs} />
      <SchoolingCard {...props("schooling")} />
      <InterestsCard {...props("interests")} />
      <HealthCard {...props("health")} />
      <LegalCard {...props("legal")} />
      <ConsentCard {...props("consent")} />
    </div>
  )
}
