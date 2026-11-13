import { useId, useState, type ReactNode } from "react"
import { ChevronDown, Lock, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/i18n/context"
import type { Role } from "@/types"

/**
 * Carte de section (bloc d'information). Sobre : surface blanche, bordure fine, rayon 16 px.
 * - `editors` : mention discrète « Tenu par : {rôle} » sous le titre (un bloc = un ou deux propriétaires).
 * - `actions` : ex. bouton « Modifier », à ne passer QUE si l'utilisateur a le droit ; masquées tant que la carte est repliée.
 * - `collapsible` : bloc replié par défaut ; `onOpen` est appelé à chaque ouverture (journal d'audit).
 * - `sensitive` : icône cadenas + mention « l'ouverture est enregistrée ».
 */
export function SectionCard({
  title,
  icon: Icon,
  description,
  actions,
  editors,
  collapsible = false,
  defaultOpen = !collapsible,
  onOpen,
  sensitive = false,
  notice,
  className,
  children,
}: {
  title: ReactNode
  icon?: LucideIcon
  description?: ReactNode
  actions?: ReactNode
  editors?: Role[]
  collapsible?: boolean
  defaultOpen?: boolean
  onOpen?: () => void
  sensitive?: boolean
  /** message discret sous l'en-tête */
  notice?: ReactNode
  className?: string
  children?: ReactNode
}) {
  const t = useT()
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) onOpen?.()
  }

  const heldBy = editors?.length
    ? `${t.pages.child.cards.heldBy} : ${editors.map((r) => t.roles[r].toLowerCase()).join(` ${t.pages.child.cards.and} `)}`
    : null

  const HeadingIcon = sensitive ? Lock : Icon
  const heading = (
    <span className="flex min-w-0 items-center gap-3">
      {HeadingIcon && (
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg",
            sensitive ? "bg-muted text-ink" : "bg-teal-soft text-teal",
          )}
        >
          <HeadingIcon className="size-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-lg leading-snug font-semibold text-ink">{title}</span>
        {(heldBy || description) && (
          <span className="mt-0.5 block text-sm text-ink-muted">{description ?? heldBy}</span>
        )}
      </span>
    </span>
  )

  const footNotes = [description && heldBy, sensitive && t.pages.child.cards.sensitive, notice].filter(Boolean)

  return (
    <section className={cn("flex flex-col rounded-card border border-line bg-surface shadow-card", className)}>
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6">
        {collapsible ? (
          <h2 className="min-w-0 flex-1">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-controls={contentId}
              className="flex w-full items-center justify-between gap-3 rounded-lg text-start"
            >
              {heading}
              <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-ink-muted">
                <span className="hidden sm:inline">{open ? t.common.collapse : t.common.expand}</span>
                <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} aria-hidden />
              </span>
            </button>
          </h2>
        ) : (
          <h2 className="min-w-0 flex-1">{heading}</h2>
        )}
        {actions && (!collapsible || open) && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {footNotes.length > 0 && (
        <div className="-mt-3 flex flex-col gap-1 px-5 pb-4 text-xs text-ink-muted sm:px-6">
          {footNotes.map((n, i) => (
            <span key={i} className={cn(sensitive && i === footNotes.length - 1 && !notice && "inline-flex items-center gap-1.5")}>
              {n}
            </span>
          ))}
        </div>
      )}

      {open && children && (
        <div id={contentId} className="flex-1 border-t border-line p-5 sm:p-6">
          {children}
        </div>
      )}
    </section>
  )
}
