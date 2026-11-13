import { useId, useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { MOOD_COLOR_VAR } from "@/lib/tokens"
import type { MoodLevel } from "@/types"

/**
 * Curseur à pastilles 1 → 5 (radiogroup). Clavier : flèches, Début, Fin ; un seul arrêt de tabulation.
 * `moodColors` colore la pastille choisie avec la couleur d'humeur (échelle « humeur générale »).
 */
export function ScaleInput({
  label,
  ends,
  value,
  onChange,
  moodColors = false,
  valueText,
}: {
  label: string
  ends: [string, string]
  value: MoodLevel
  onChange: (v: MoodLevel) => void
  moodColors?: boolean
  valueText: (n: number) => string
}) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const select = (n: number) => {
    const v = Math.min(5, Math.max(1, n)) as MoodLevel
    onChange(v)
    refs.current[v - 1]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const rtl = document.documentElement.dir === "rtl"
    const next = rtl ? "ArrowLeft" : "ArrowRight"
    const prev = rtl ? "ArrowRight" : "ArrowLeft"
    if (e.key === next || e.key === "ArrowUp") select(value + 1)
    else if (e.key === prev || e.key === "ArrowDown") select(value - 1)
    else if (e.key === "Home") select(1)
    else if (e.key === "End") select(5)
    else return
    e.preventDefault()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span id={`${id}-label`} className="text-sm font-medium text-ink">
          {label}
        </span>
        <span className="text-sm font-semibold text-ink tabular-nums">{value} / 5</span>
      </div>
      <div role="radiogroup" aria-labelledby={`${id}-label`} onKeyDown={onKeyDown} className="relative flex items-center justify-between">
        <span aria-hidden className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = n === value
          const filled = n <= value
          const color = moodColors ? MOOD_COLOR_VAR[n as MoodLevel] : "var(--cdis-teal)"
          return (
            <button
              key={n}
              ref={(el) => {
                refs.current[n - 1] = el
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={valueText(n)}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(n)}
              className={cn(
                "relative grid size-10 place-items-center rounded-full border-2 text-sm font-semibold transition-all",
                selected ? "scale-110 text-white shadow-sm" : filled ? "text-ink" : "border-line bg-surface text-ink-muted hover:border-ink-muted",
              )}
              style={
                selected
                  ? // texte encre sur les couleurs d'humeur (contraste AA), blanc sur la sarcelle
                    { backgroundColor: color, borderColor: color, color: moodColors ? "var(--cdis-ink)" : undefined }
                  : filled
                    ? { borderColor: color, backgroundColor: `color-mix(in oklab, ${color} 14%, white)` }
                    : undefined
              }
            >
              {n}
            </button>
          )
        })}
      </div>
      <div aria-hidden className="flex justify-between text-xs text-ink-muted">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  )
}
