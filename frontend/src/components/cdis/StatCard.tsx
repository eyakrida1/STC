import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Chiffre clé (tableau de bord). Sobre : le chiffre porte l'information, pas la couleur. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  /** « attention » : repère discret pour un chiffre qui demande une action */
  tone?: "default" | "attention"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card",
        tone === "attention" && "border-s-4 border-s-mood-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        {Icon && <Icon className="size-5 text-ink-muted" aria-hidden />}
      </div>
      <p className="text-3xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  )
}
