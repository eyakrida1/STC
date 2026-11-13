import { cn } from "@/lib/utils"
import { PHASE_BADGE, PHASE_DOT } from "@/lib/tokens"
import { useT } from "@/i18n/context"
import type { PhaseId } from "@/types"
import { pill, sizes } from "./badge-styles"

/** Phase du parcours (1 à 5) — « 3 · Accompagnement » ou libellé complet. */
export function PhaseBadge({
  phase,
  variant = "short",
  size = "sm",
  className,
}: {
  phase: PhaseId
  variant?: "short" | "long"
  size?: keyof typeof sizes
  className?: string
}) {
  const t = useT()
  const label = variant === "long" ? t.phases.long[phase] : t.phases.short[phase]
  return (
    <span
      className={cn(pill, sizes[size], PHASE_BADGE[phase], className)}
      aria-label={t.components.phaseAria(phase, t.phases.long[phase])}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", PHASE_DOT[phase])} />
      <span aria-hidden>{t.components.phaseShort(phase, label)}</span>
    </span>
  )
}
