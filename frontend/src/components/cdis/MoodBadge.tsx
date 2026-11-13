import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { MOOD_DOT, MOOD_SOFT_BG } from "@/lib/tokens"
import { useT } from "@/i18n/context"
import type { MoodLevel } from "@/types"
import { pill, sizes } from "./badge-styles"

/**
 * Humeur générale (5 niveaux).
 * `withPrefix` affiche « Humeur : bien » ; `detail` ajoute une précision (« partagée par le psy le 12/11 »).
 */
export function MoodBadge({
  level,
  size = "sm",
  showLabel = true,
  withPrefix = false,
  detail,
  className,
}: {
  level: MoodLevel
  size?: keyof typeof sizes
  showLabel?: boolean
  withPrefix?: boolean
  detail?: ReactNode
  className?: string
}) {
  const t = useT()
  if (!showLabel) {
    return (
      <span
        role="img"
        aria-label={t.components.moodAria(t.moods[level])}
        className={cn("inline-block size-3 rounded-full", MOOD_DOT[level], className)}
      />
    )
  }
  const label = withPrefix ? t.moods[level].toLowerCase() : t.moods[level]
  return (
    <span className={cn(pill, sizes[size], "h-auto min-h-6 py-0.5 whitespace-normal text-ink", MOOD_SOFT_BG[level], className)}>
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", MOOD_DOT[level])} />
      <span>
        {withPrefix ? (
          <>
            {t.moodPrefix} : <strong className="font-semibold">{label}</strong>
          </>
        ) : (
          <>
            <span className="sr-only">{t.moodLabel} : </span>
            {label}
          </>
        )}
        {detail && <span className="font-normal text-ink-muted"> · {detail}</span>}
      </span>
    </span>
  )
}
