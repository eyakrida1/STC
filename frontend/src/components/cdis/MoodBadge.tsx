import { cn } from "@/lib/utils"
import { MOOD_DOT, MOOD_SOFT_BG } from "@/lib/tokens"
import { useT } from "@/i18n/context"
import type { MoodLevel } from "@/types"
import { pill, sizes } from "./badge-styles"

/** Humeur générale (5 niveaux). */
export function MoodBadge({
  level,
  size = "sm",
  showLabel = true,
  className,
}: {
  level: MoodLevel
  size?: keyof typeof sizes
  showLabel?: boolean
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
  return (
    <span className={cn(pill, sizes[size], "text-ink", MOOD_SOFT_BG[level], className)}>
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", MOOD_DOT[level])} />
      <span className="sr-only">{t.moodLabel} : </span>
      {t.moods[level]}
    </span>
  )
}
