import { Fragment } from "react"
import { useT } from "@/i18n/context"
import { PHASE_COLOR_VAR } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import { PHASES, type PhaseId } from "@/types"

/** Mini-frise des 5 phases : phases passées pleines, phase actuelle en surbrillance, phases à venir en creux. */
export function PhaseTrack({ phase, className }: { phase: PhaseId; className?: string }) {
  const t = useT()
  return (
    <span
      role="img"
      aria-label={`${t.pages.child.phaseTimeline(phase)} : ${t.phases.long[phase]}`}
      className={cn("inline-flex items-center", className)}
    >
      {PHASES.map((p) => {
        const color = PHASE_COLOR_VAR[p]
        const current = p === phase
        const past = p < phase
        return (
          <Fragment key={p}>
            {p > 1 && (
              <span
                aria-hidden
                className="h-0.5 w-3 sm:w-4"
                style={{ backgroundColor: p <= phase ? PHASE_COLOR_VAR[phase] : "var(--cdis-line)" }}
              />
            )}
            <span
              aria-hidden
              className={cn("rounded-full border-2", current ? "size-4 ring-4" : "size-2.5")}
              style={{
                borderColor: past || current ? color : "var(--cdis-line-strong)",
                backgroundColor: past || current ? color : "var(--cdis-surface)",
                ["--tw-ring-color" as string]: `color-mix(in oklab, ${color} 30%, transparent)`,
              }}
            />
          </Fragment>
        )
      })}
    </span>
  )
}
