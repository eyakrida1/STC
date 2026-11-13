import { useState, type ReactNode } from "react"
import { Pencil, type LucideIcon } from "lucide-react"
import { SectionCard } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useT } from "@/i18n/context"
import { BLOCK_EDITORS } from "@/lib/access"
import type { Errors } from "@/lib/validation"
import type { Child, ChildBlock } from "@/types"
import { EditSheet } from "./EditSheet"

export type EditableBlock = Exclude<ChildBlock, "mood">

export interface BlockProps {
  child: Child
  canEdit: boolean
  onSave: <K extends EditableBlock>(block: K, value: Child[K]) => Promise<void>
}

/**
 * Carte d'un bloc de la partie commune + son panneau « Modifier ».
 * Le bouton n'est rendu que si `canEdit` (droits calculés par lib/access.ts, revérifiés par api/).
 */
export function BlockCard<K extends EditableBlock>({
  block,
  icon,
  child,
  canEdit,
  onSave,
  validate,
  form,
  editDescription,
  collapsible,
  sensitive,
  onOpen,
  children,
}: BlockProps & {
  block: K
  icon: LucideIcon
  validate: (draft: Child[K]) => Errors
  form: (draft: Child[K], setDraft: (update: (d: Child[K]) => Child[K]) => void, errors: Errors) => ReactNode
  editDescription?: string
  collapsible?: boolean
  sensitive?: boolean
  onOpen?: () => void
  children: ReactNode
}) {
  const t = useT()
  const c = t.pages.child.cards
  const title = t.blocks[block]
  const [editing, setEditing] = useState(false)

  return (
    <>
      <SectionCard
        title={title}
        icon={icon}
        editors={BLOCK_EDITORS[block]}
        collapsible={collapsible}
        sensitive={sensitive}
        onOpen={onOpen}
        actions={
          canEdit && (
            <Button variant="outline" onClick={() => setEditing(true)} aria-label={c.editTitle(title)}>
              <Pencil data-icon="inline-start" aria-hidden />
              <span aria-hidden>{c.edit}</span>
            </Button>
          )
        }
      >
        {children}
      </SectionCard>
      {canEdit && (
        <EditSheet
          open={editing}
          onOpenChange={setEditing}
          title={c.editTitle(title)}
          description={editDescription}
          initial={child[block]}
          validate={validate}
          save={(draft) => onSave(block, draft)}
          savedMessage={c.saved(title)}
        >
          {form}
        </EditSheet>
      )}
    </>
  )
}
