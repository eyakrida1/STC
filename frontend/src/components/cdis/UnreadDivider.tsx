import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Trait de séparation entre « Nouvelles » et « Déjà lues ». */
export function UnreadDivider({
  label,
  count,
  tone = "read",
  className,
}: {
  label: ReactNode
  count?: number
  /** « new » : en-tête de la zone des nouvelles notes (accent primaire) */
  tone?: "new" | "read"
  className?: string
}) {
  return (
    <div role="separator" aria-label={typeof label === "string" ? label : undefined} className={cn("flex items-center gap-3 py-2", className)}>
      <span className={cn("h-px flex-1", tone === "new" ? "bg-teal/40" : "bg-line")} />
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
          tone === "new" ? "bg-teal-soft text-teal" : "bg-muted text-ink-muted",
        )}
      >
        {label}
        {count !== undefined && <span className="tabular-nums">· {count}</span>}
      </span>
      <span className={cn("h-px flex-1", tone === "new" ? "bg-teal/40" : "bg-line")} />
    </div>
  )
}
