import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Check, ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { StatCard, TextareaField } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/i18n/context"
import { localISODate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { addMonths, daysInMonth, monthStart } from "@/lib/week"
import type { AttendanceEntry, AttendanceStatus } from "@/types"

const STATUS_STYLE: Record<AttendanceStatus, { cell: string; dot: string }> = {
  present: { cell: "bg-att-present-soft text-att-present-ink", dot: "bg-att-present" },
  absent: { cell: "bg-att-absent-soft text-att-absent-ink ring-2 ring-att-absent", dot: "bg-att-absent" },
  absent_justifie: { cell: "bg-att-justified-soft text-att-justified-ink ring-2 ring-att-justified", dot: "bg-att-justified" },
}
const STATUSES: AttendanceStatus[] = ["present", "absent", "absent_justifie"]

/** Calendrier mensuel de présence. Saisie par l'éducateur ; psy et social en lecture seule (absences mises en évidence). */
export function AttendanceMonth({ childId, readOnly, heldBy }: { childId: string; readOnly: boolean; heldBy: string }) {
  const { t, intlLocale } = useI18n()
  const A = t.followup.attendance
  const [month, setMonth] = useState(() => monthStart())
  const [entries, setEntries] = useState<AttendanceEntry[] | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const days = daysInMonth(month)
  const load = useCallback(() => {
    api.getAttendance(childId, days[0], days.at(-1)!).then(setEntries).catch(() => setEntries([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, month])
  useEffect(() => {
    load()
  }, [load])

  const today = localISODate()
  const byDate = new Map(entries?.map((e) => [e.date, e]) ?? [])
  const recorded = entries ?? []
  const present = recorded.filter((e) => e.status === "present").length
  const absent = recorded.filter((e) => e.status !== "present").length
  const justified = recorded.filter((e) => e.status === "absent_justifie").length
  const rate = recorded.length ? Math.round((present / recorded.length) * 100) : null
  const offset = (new Date(`${month}T12:00:00`).getDay() + 6) % 7
  const fmtLong = (d: string) => new Intl.DateTimeFormat(intlLocale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${d}T12:00:00`))
  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(new Date(`${month}T12:00:00`))
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(new Date(2024, 0, 1 + i)))
  const isCurrentMonth = month === monthStart()

  const statusLabel = (d: string) => {
    const e = byDate.get(d)
    const sunday = new Date(`${d}T12:00:00`).getDay() === 0
    if (sunday) return A.closed
    if (d > today) return A.future
    if (!e) return A.notRecorded
    return `${t.attendance[e.status]}${e.reason ? ` (${e.reason})` : ""}`
  }

  return (
    <section aria-labelledby="att-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="att-title" className="text-xl font-semibold text-ink">
            {A.title}
          </h2>
          <p className="text-sm text-ink-muted first-letter:uppercase">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label={A.prevMonth} onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="rtl:rotate-180" aria-hidden />
          </Button>
          <Button variant="outline" size="icon" aria-label={A.nextMonth} disabled={isCurrentMonth} onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="rtl:rotate-180" aria-hidden />
          </Button>
        </div>
      </div>

      {readOnly && (
        <p className="inline-flex w-fit items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-ink">
          <Eye className="size-4 text-ink-muted" aria-hidden />
          {A.heldBy(heldBy)}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label={A.rate} value={rate === null ? "—" : `${rate} %`} />
        <StatCard label={A.absences} value={absent} hint={justified ? A.justified(justified) : undefined} tone={absent > 3 ? "attention" : "default"} />
      </div>

      <div className="rounded-card border border-line bg-surface p-3 shadow-card sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          <div className="contents">
            {weekdays.map((w) => (
              <div key={w} aria-hidden className="pb-1 text-center text-xs font-semibold text-ink-muted first-letter:uppercase">
                {w}
              </div>
            ))}
          </div>
          <div className="contents">
            {Array.from({ length: offset }, (_, i) => (
              <div key={`o${i}`} aria-hidden />
            ))}
            {days.map((d) => {
              const e = byDate.get(d)
              const sunday = new Date(`${d}T12:00:00`).getDay() === 0
              const future = d > today
              const editable = !readOnly && !sunday && !future
              const label = A.dayAria(fmtLong(d), statusLabel(d))
              const cls = cn(
                "relative flex aspect-square min-h-10 flex-col items-center justify-center rounded-lg text-sm font-medium tabular-nums sm:aspect-auto sm:h-16",
                sunday ? "bg-muted/60 text-ink-muted" : e ? STATUS_STYLE[e.status].cell : future ? "text-ink-muted" : "border border-dashed border-line text-ink",
                d === today && "outline-2 outline-offset-1 outline-teal",
              )
              const inner = (
                <>
                  <span>{Number(d.slice(8))}</span>
                  {e && !sunday && <span aria-hidden className={cn("mt-1 size-1.5 rounded-full", STATUS_STYLE[e.status].dot)} />}
                </>
              )
              return (
                <div key={d}>
                  {editable ? (
                    <button type="button" onClick={() => setEditing(d)} aria-label={label} title={statusLabel(d)} className={cn(cls, "w-full transition hover:shadow-raised")}>
                      {inner}
                    </button>
                  ) : (
                    <div aria-label={label} title={statusLabel(d)} className={cls}>
                      {inner}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {entries !== null && !entries.length && <p className="mt-3 text-center text-sm text-ink-muted">{A.noData}</p>}
      </div>

      <ul aria-label={A.legend} className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
        {STATUSES.map((s) => (
          <li key={s} className="inline-flex items-center gap-2">
            <span aria-hidden className={cn("size-3 rounded-full", STATUS_STYLE[s].dot)} />
            {t.attendance[s]}
          </li>
        ))}
        <li className="inline-flex items-center gap-2 text-ink-muted">
          <span aria-hidden className="size-3 rounded-full border border-dashed border-ink-muted" />
          {A.notRecorded}
        </li>
      </ul>

      {!readOnly && (
        <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="p-6 sm:max-w-md">
            {editing && (
              <DayForm
                key={editing}
                date={editing}
                label={fmtLong(editing)}
                current={byDate.get(editing) ?? null}
                childId={childId}
                onClose={() => setEditing(null)}
                onSaved={(entry) => {
                  setEntries((list) => [...(list ?? []).filter((x) => x.date !== entry.date), entry])
                  setEditing(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}

function DayForm({
  date,
  label,
  current,
  childId,
  onClose,
  onSaved,
}: {
  date: string
  label: string
  current: AttendanceEntry | null
  childId: string
  onClose: () => void
  onSaved: (e: AttendanceEntry) => void
}) {
  const { t } = useI18n()
  const A = t.followup.attendance
  const [status, setStatus] = useState<AttendanceStatus>(current?.status ?? "present")
  const [reason, setReason] = useState(current?.reason ?? "")
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const reasonError = submitted && status === "absent_justifie" && !reason.trim() ? A.reasonRequired : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (status === "absent_justifie" && !reason.trim()) return
    setBusy(true)
    try {
      const saved = await api.setAttendance({ childId, date, status, reason: status === "present" ? null : reason.trim() || null })
      toast.success(A.saved)
      onSaved(saved)
    } catch {
      toast.error(A.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-ink first-letter:uppercase">{A.choose(label)}</DialogTitle>
        <DialogDescription className="sr-only">{A.title}</DialogDescription>
      </DialogHeader>
      <div role="radiogroup" aria-label={A.title} className="grid gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              "flex h-12 items-center gap-3 rounded-lg border px-3 text-start text-sm font-medium transition-colors",
              status === s ? cn(STATUS_STYLE[s].cell, "border-transparent") : "border-line bg-surface text-ink hover:border-ink-muted",
            )}
          >
            <span aria-hidden className={cn("size-3 rounded-full", STATUS_STYLE[s].dot)} />
            <span className="flex-1">{t.attendance[s]}</span>
            {status === s && <Check className="size-4" aria-hidden />}
          </button>
        ))}
      </div>
      {status !== "present" && (
        <TextareaField
          label={status === "absent_justifie" ? `${A.reason} *` : A.reason}
          value={reason}
          onChange={setReason}
          rows={2}
          error={reasonError}
        />
      )}
      <DialogFooter className="gap-2 sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t.common.save}
        </Button>
      </DialogFooter>
    </form>
  )
}
