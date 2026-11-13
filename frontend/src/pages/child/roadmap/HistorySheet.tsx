import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/i18n/context"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Roadmap, RoadmapContentMap, RoadmapPartKey } from "@/types"
import type { TeamMember } from "../ChildHero"
import { diffPart } from "./diff"

/** Historique des versions d'une partie (validations, modifications, rejets), le plus récent en haut. */
export function HistorySheet({
  part,
  roadmap,
  team,
  onOpenChange,
}: {
  part: RoadmapPartKey | null
  roadmap: Roadmap
  team: TeamMember[]
  onOpenChange: (open: boolean) => void
}) {
  const { t, intlLocale, dir } = useI18n()
  const R = t.roadmap
  const fmt = (d: string) => formatDate(d, intlLocale)
  const name = (id: string) => {
    const m = team.find((x) => x.id === id)
    return m ? `${m.firstName} ${m.lastName}` : ""
  }

  const p = part ? roadmap.parts[part] : null
  type Entry = { at: string; kind: "version" | "rejected"; node: React.ReactNode }
  const entries: Entry[] = []
  if (part && p) {
    p.history.forEach((v, i) => {
      const prev = p.history[i - 1]
      const changes = prev
        ? diffPart(part, prev.content as RoadmapContentMap[typeof part], v.content as RoadmapContentMap[typeof part], fmt).flatMap((d) =>
            d.items.filter((it) => it.status !== "kept").map((it) => ({ ...it, field: d.field })),
          )
        : []
      entries.push({
        at: v.validatedAt,
        kind: "version",
        node: (
          <>
            <p className="font-semibold text-ink">
              {R.version(v.version)} · {R.decisions[v.decision]}
            </p>
            <p className="text-xs text-ink-muted">
              {fmt(v.validatedAt)} {name(v.validatedBy) && R.by(name(v.validatedBy))}
            </p>
            {v.justification && <p className="mt-1 text-sm text-ink italic">« {v.justification} »</p>}
            {changes.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {changes.map((c) => (
                  <li key={c.key} className={cn("rounded px-2 py-0.5 text-xs", c.status === "added" ? "bg-phase-5-soft text-phase-5-ink" : "bg-destructive/5 text-ink-muted line-through")}>
                    {R.fields[c.field]} : {c.text}
                  </li>
                ))}
              </ul>
            )}
          </>
        ),
      })
    })
    p.rejected.forEach((r) =>
      entries.push({
        at: r.at,
        kind: "rejected",
        node: (
          <>
            <p className="font-semibold text-destructive">{R.rejectedEntry}</p>
            <p className="text-xs text-ink-muted">
              {fmt(r.at)} {name(r.by) && R.by(name(r.by))}
            </p>
            <p className="mt-1 text-sm text-ink italic">« {r.justification} »</p>
          </>
        ),
      }),
    )
  }
  entries.sort((a, b) => b.at.localeCompare(a.at))

  return (
    <Sheet open={part !== null} onOpenChange={onOpenChange}>
      <SheetContent side={dir === "rtl" ? "left" : "right"} className="w-full gap-0 bg-surface p-0 data-[side=left]:sm:max-w-lg data-[side=right]:sm:max-w-lg">
        {part && (
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="border-b border-line p-5 pe-14 sm:p-6 sm:pe-14">
              <SheetTitle className="text-xl font-semibold text-ink">{R.historyTitle(R.parts[part])}</SheetTitle>
              <SheetDescription className="sr-only">{R.history}</SheetDescription>
            </SheetHeader>
            <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5 sm:p-6">
              {entries.map((e, i) => (
                <li key={i} className={cn("rounded-xl border p-4", e.kind === "rejected" ? "border-destructive/30" : "border-line")}>
                  {e.node}
                </li>
              ))}
            </ol>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
