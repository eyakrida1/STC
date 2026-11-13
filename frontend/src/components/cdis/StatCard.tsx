import type { ReactNode } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatTrend {
  /** texte court : « +12 % », « −2 pts », « = » */
  text: string
  direction: "up" | "down" | "flat"
  /** lecture métier de la variation (une hausse des absences est « bad ») */
  tone: "good" | "bad" | "neutral"
  /** phrase complète pour les lecteurs d'écran */
  label: string
}

const TREND_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight }
const TREND_TONE = { good: "text-att-present-ink", bad: "text-att-absent-ink", neutral: "text-ink-muted" }

/** Chiffre clé (tableau de bord). Sobre : le chiffre porte l'information, pas la couleur. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  trend,
  className,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  /** « attention » : repère discret pour un chiffre qui demande une action */
  tone?: "default" | "attention"
  /** variation par rapport à la période précédente (flèche + texte, jamais la couleur seule) */
  trend?: StatTrend
  className?: string
}) {
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null
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
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-3xl font-semibold tracking-tight text-ink tabular-nums">{value}</p>
        {trend && TrendIcon && (
          <p className={cn("inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums", TREND_TONE[trend.tone])}>
            <TrendIcon className="size-4" aria-hidden />
            <span aria-hidden>{trend.text}</span>
            <span className="sr-only">{trend.label}</span>
          </p>
        )}
      </div>
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  )
}
