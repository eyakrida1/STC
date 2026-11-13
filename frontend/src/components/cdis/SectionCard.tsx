import { useId, useState, type ReactNode } from "react"
import { ChevronDown, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useT } from "@/i18n/context"
import type { Role } from "@/types"
import { RoleBadge } from "./RoleBadge"

/**
 * Carte de section (bloc d'information). Sobre : surface blanche, bordure fine, rayon 16 px.
 * `editors` affiche « Modifié par » + pastilles de rôle (un bloc = un propriétaire).
 * `collapsible` : bloc replié par défaut (Santé, Situation judiciaire) ; `onOpen` sert au journal d'audit.
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
  /** message discret sous l'en-tête (ex. « ouverture tracée ») */
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

  const heading = (
    <span className="flex min-w-0 items-center gap-3">
      {Icon && (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-soft text-teal">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-lg font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>}
      </span>
    </span>
  )

  return (
    <section className={cn("rounded-card border border-line bg-surface shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
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
              <span className="flex items-center gap-1 text-sm font-medium text-ink-muted">
                {open ? t.common.collapse : t.common.expand}
                <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
              </span>
            </button>
          </h2>
        ) : (
          <h2 className="min-w-0 flex-1">{heading}</h2>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {(editors?.length || notice) && open && (
        <div className="-mt-2 flex flex-wrap items-center gap-2 px-5 pb-3 text-xs text-ink-muted sm:px-6">
          {editors?.length ? (
            <>
              <span>{t.common.editedBy}</span>
              {editors.map((r) => (
                <RoleBadge key={r} role={r} />
              ))}
            </>
          ) : null}
          {notice && <span>{notice}</span>}
        </div>
      )}

      {open && children && (
        <div id={contentId} className="border-t border-line p-5 sm:p-6">
          {children}
        </div>
      )}
    </section>
  )
}
