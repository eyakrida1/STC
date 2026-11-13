import { Link } from "react-router"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SegmentItem {
  key: string
  label: string
  to: string
  icon?: LucideIcon
  /** mention discrète (ex. « lecture seule ») */
  hint?: string
}

/**
 * Sélecteur secondaire (segmented control) : de vrais liens (la sous-section est dans l'URL), aria-current sur l'actif.
 * Sobre : fond sable, segment actif blanc. Défile horizontalement sur mobile.
 */
export function SegmentedControl({ items, active, label, className }: { items: SegmentItem[]; active: string; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)}>
      <ul className="inline-flex gap-1 rounded-xl bg-muted p-1">
        {items.map(({ key, label: l, to, icon: Icon, hint }) => {
          const current = key === active
          return (
            <li key={key} className="shrink-0">
              <Link
                to={to}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                  current ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                {Icon && <Icon className="size-4" aria-hidden />}
                {l}
                {hint && <span className="text-xs font-normal text-ink-muted">· {hint}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
