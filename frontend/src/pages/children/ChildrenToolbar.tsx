import { ChevronDown, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useT } from "@/i18n/context"
import { PHASE_DOT } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import { PHASES, type PhaseId } from "@/types"
import { SORT_KEYS, type ChildrenFilters, type SortKey } from "./filters"

const chip =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors"

/** Recherche instantanée, filtre par phase (pastilles), tri. */
export function ChildrenToolbar({
  filters,
  onChange,
}: {
  filters: ChildrenFilters
  onChange: (patch: Partial<ChildrenFilters>) => void
}) {
  const t = useT()
  const p = t.pages.children

  const phaseButton = (phase: PhaseId | null) => {
    const active = filters.phase === phase
    return (
      <button
        key={phase ?? "all"}
        type="button"
        aria-pressed={active}
        onClick={() => onChange({ phase })}
        className={cn(
          chip,
          active
            ? "border-teal bg-teal text-white"
            : "border-line bg-surface text-ink hover:border-ink-muted",
        )}
      >
        {phase !== null && (
          <span aria-hidden className={cn("size-2 rounded-full", PHASE_DOT[phase], active && "ring-2 ring-white")} />
        )}
        {phase === null ? p.allPhases : t.components.phaseShort(phase, t.phases.short[phase])}
      </button>
    )
  }

  return (
    <section aria-label={p.toolbar} className="mb-6 flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="children-search" className="sr-only">
            {p.search}
          </label>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input
            id="children-search"
            type="search"
            autoComplete="off"
            placeholder={p.searchPlaceholder}
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            className="ps-11 pe-11 [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ query: "" })}
              aria-label={p.clearFilters}
              className="absolute inset-y-0 end-0 grid w-11 place-items-center text-ink-muted hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="children-sort" className="text-sm whitespace-nowrap text-ink-muted">
            {p.sort}
          </label>
          <div className="relative">
            <select
              id="children-sort"
              value={filters.sort}
              onChange={(e) => onChange({ sort: e.target.value as SortKey })}
              className="h-11 appearance-none rounded-lg border border-input bg-surface ps-3 pe-10 text-base text-ink"
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {p.sortOptions[k]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          </div>
        </div>
      </div>

      {/* mobile : une seule ligne défilante ; à partir de sm : retour à la ligne */}
      <div
        role="group"
        aria-label={p.phaseFilter}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
      >
        {phaseButton(null)}
        {PHASES.map(phaseButton)}
      </div>
    </section>
  )
}
