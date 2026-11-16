import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from "react"
import { ChevronLeft, ChevronRight, Eye, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { EmptyState, SelectField, TextareaField, TextField } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/i18n/context"
import { addDays, localISODate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { isBlank, type Errors } from "@/lib/validation"
import { mondayOf } from "@/lib/week"
import type { Activity, Weekday } from "@/types"

const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6]
type Slot = "matin" | "apres-midi"
const slotOf = (start: string): Slot => (start < "13:00" ? "matin" : "apres-midi")

/** Couleur douce stable par intitulé (tons des phases : sobres, pas de « pop »). */
function tone(title: string) {
  let h = 0
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) % 997
  const n = (h % 5) + 1
  return { backgroundColor: `var(--cdis-phase-${n}-soft)`, borderInlineStartColor: `var(--cdis-phase-${n})` }
}

type Draft = Omit<Activity, "id" | "childId"> & { id?: string }

/** Planning de la semaine (lundi → samedi, matin / après-midi). Éditable par l'éducateur, lecture seule pour le psy. */
export function ActivitiesWeek({ childId, readOnly, heldBy }: { childId: string; readOnly: boolean; heldBy: string }) {
  const { t, intlLocale } = useI18n()
  const A = t.followup.activities
  const [week, setWeek] = useState(() => mondayOf())
  const [items, setItems] = useState<Activity[] | null>(null)
  const [editing, setEditing] = useState<Draft | null>(null)
  const [dropDay, setDropDay] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    api
      .listActivities(childId, week)
      .then((list) => {
        setItems(list)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [childId, week])
  useEffect(() => {
    load()
  }, [load])

  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale, opts).format(new Date(`${d}T12:00:00`))
  const isThisWeek = week === mondayOf()

  const move = async (id: string, day: Weekday, slot: Slot) => {
    const a = items?.find((x) => x.id === id)
    if (!a || (a.weekday === day && slotOf(a.start) === slot)) return
    let { start, end } = a
    if (slotOf(start) !== slot) {
      // change de créneau : on garde la durée, début à 10 h ou 14 h
      const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3))
      const dur = toMin(end) - toMin(start)
      const s0 = slot === "matin" ? 600 : 840
      const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
      start = hhmm(s0)
      end = hhmm(Math.min(s0 + dur, 18 * 60))
    }
    const optimistic = items!.map((x) => (x.id === id ? { ...x, weekday: day, start, end } : x))
    setItems(optimistic)
    try {
      await api.saveActivity({ ...a, weekday: day, start, end })
      toast.success(A.moved(A.days[day - 1]))
    } catch {
      toast.error(A.error)
      load()
    }
  }

  const onDrop = (e: DragEvent, day: Weekday, slot: Slot) => {
    e.preventDefault()
    setDropDay(null)
    const id = e.dataTransfer.getData("text/plain")
    if (id) void move(id, day, slot)
  }

  return (
    <section aria-labelledby="act-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="act-title" className="text-xl font-semibold text-ink">
            {A.title}
          </h2>
          <p className="text-sm text-ink-muted">{A.week(fmt(week, { day: "numeric", month: "long" }), fmt(addDays(week, 5), { day: "numeric", month: "long" }))}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label={A.prevWeek} onClick={() => setWeek((w) => addDays(w, -7))}>
            <ChevronLeft className="rtl:rotate-180" aria-hidden />
          </Button>
          <Button variant="outline" disabled={isThisWeek} onClick={() => setWeek(mondayOf())}>
            {A.thisWeek}
          </Button>
          <Button variant="outline" size="icon" aria-label={A.nextWeek} onClick={() => setWeek((w) => addDays(w, 7))}>
            <ChevronRight className="rtl:rotate-180" aria-hidden />
          </Button>
          {!readOnly && (
            <Button onClick={() => setEditing({ weekday: 1, start: "10:00", end: "11:00", title: "", objective: "", weekStart: null })}>
              <Plus data-icon="inline-start" aria-hidden />
              {A.add}
            </Button>
          )}
        </div>
      </div>

      {readOnly ? (
        <p className="inline-flex w-fit items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-ink">
          <Eye className="size-4 text-ink-muted" aria-hidden />
          {A.heldBy(heldBy)}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">{A.dragHint}</p>
      )}

      {failed ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={TriangleAlert} title={t.pages.child.loadError} action={<Button variant="outline" onClick={load}>{t.pages.children.retry}</Button>} />
        </div>
      ) : items === null ? (
        <div className="h-64 animate-pulse rounded-card border border-line bg-surface" aria-busy="true" />
      ) : (
        <ol className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {DAYS.map((day) => {
            const date = addDays(week, day - 1)
            const today = date === localISODate()
            return (
              <li key={day} className={cn("flex flex-col rounded-card border bg-surface shadow-card", today ? "border-teal" : "border-line")}>
                <h3 className="flex items-baseline justify-between border-b border-line px-3 py-2">
                  <span className="text-sm font-semibold text-ink">{A.days[day - 1]}</span>
                  <span className="text-xs text-ink-muted">{fmt(date, { day: "numeric", month: "short" })}</span>
                </h3>
                {(["matin", "apres-midi"] as Slot[]).map((slot) => {
                  const list = items.filter((a) => a.weekday === day && slotOf(a.start) === slot).sort((a, b) => a.start.localeCompare(b.start))
                  const dropKey = `${day}-${slot}`
                  return (
                    <div
                      key={slot}
                      className={cn("flex min-h-24 flex-col gap-2 p-2 transition-colors", slot === "apres-midi" && "border-t border-dashed border-line", dropDay === dropKey && "bg-teal-soft")}
                      onDragOver={readOnly ? undefined : (e) => (e.preventDefault(), setDropDay(dropKey))}
                      onDragLeave={readOnly ? undefined : () => setDropDay((d) => (d === dropKey ? null : d))}
                      onDrop={readOnly ? undefined : (e) => onDrop(e, day, slot)}
                    >
                      <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{slot === "matin" ? A.morning : A.afternoon}</span>
                      {list.map((a) => {
                        const body = (
                          <>
                            <span className="block text-sm font-semibold text-ink">{a.title}</span>
                            <span className="block text-xs text-ink tabular-nums">
                              {a.start} – {a.end}
                              {a.weekStart && <span className="text-ink-muted"> · {A.once}</span>}
                            </span>
                            {a.objective && <span className="mt-0.5 block text-xs text-ink-muted">{a.objective}</span>}
                          </>
                        )
                        const cls = "block w-full rounded-lg border-s-4 px-2.5 py-2 text-start"
                        return readOnly ? (
                          <div key={a.id} className={cls} style={tone(a.title)}>
                            {body}
                          </div>
                        ) : (
                          <button
                            key={a.id}
                            type="button"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                            onClick={() => setEditing({ ...a })}
                            aria-label={`${A.edit} : ${a.title}, ${A.days[day - 1]} ${a.start}`}
                            className={cn(cls, "cursor-grab transition-shadow hover:shadow-raised active:cursor-grabbing")}
                            style={tone(a.title)}
                          >
                            {body}
                          </button>
                        )
                      })}
                      {!list.length && <span className="text-xs text-ink-muted">{A.empty}</span>}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({ weekday: day, start: slot === "matin" ? "10:00" : "14:00", end: slot === "matin" ? "11:00" : "15:00", title: "", objective: "", weekStart: null })
                          }
                          aria-label={A.addHere(A.days[day - 1], slot === "matin" ? A.morning : A.afternoon)}
                          className="mt-auto grid h-8 place-items-center rounded-lg border border-dashed border-line text-ink-muted hover:border-teal hover:text-teal"
                        >
                          <Plus className="size-4" aria-hidden />
                        </button>
                      )}
                    </div>
                  )
                })}
              </li>
            )
          })}
        </ol>
      )}

      {!readOnly && (
        <ActivityDialog
          draft={editing}
          week={week}
          childId={childId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </section>
  )
}

function ActivityDialog({
  draft,
  week,
  childId,
  onClose,
  onSaved,
}: {
  draft: Draft | null
  week: string
  childId: string
  onClose: () => void
  onSaved: () => void
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-lg">
        {draft && <ActivityForm key={draft.id ?? "new"} initial={draft} week={week} childId={childId} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  )
}

function ActivityForm({
  initial,
  week,
  childId,
  onClose,
  onSaved,
}: {
  initial: Draft
  week: string
  childId: string
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const A = t.followup.activities
  const F = A.fields
  const [d, setD] = useState<Draft>(initial)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))

  const validate = (x: Draft): Errors => ({
    title: isBlank(x.title) ? t.pages.child.cards.required : undefined,
    end: x.start >= x.end ? A.endBeforeStart : undefined,
  })
  const errors = submitted ? validate(d) : {}

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.values(validate(d)).some(Boolean)) return
    setBusy(true)
    try {
      await api.saveActivity({ ...d, childId, title: d.title.trim(), objective: d.objective.trim() })
      toast.success(A.saved)
      onSaved()
    } catch {
      toast.error(A.error)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!d.id) return
    setBusy(true)
    try {
      await api.deleteActivity(d.id)
      toast.success(A.deleted)
      onSaved()
    } catch {
      toast.error(A.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-ink">{d.id ? A.edit : A.newTitle}</DialogTitle>
        <DialogDescription className="sr-only">{A.title}</DialogDescription>
      </DialogHeader>
      <TextField label={F.title} placeholder={F.titlePlaceholder} value={d.title} onChange={(v) => set({ title: v })} error={errors.title} />
      <div className="grid grid-cols-3 gap-3">
        <SelectField<Weekday> label={F.day} value={d.weekday} onChange={(v) => set({ weekday: v })} options={DAYS.map((w) => ({ value: w, label: A.days[w - 1] }))} />
        <TextField label={F.start} type="time" value={d.start} onChange={(v) => set({ start: v })} />
        <TextField label={F.end} type="time" value={d.end} onChange={(v) => set({ end: v })} error={errors.end} />
      </div>
      <TextareaField label={F.objective} value={d.objective} onChange={(v) => set({ objective: v })} rows={2} />
      {!d.id && (
        <SelectField<"weekly" | "once">
          label={F.recurrence}
          value={d.weekStart ? "once" : "weekly"}
          onChange={(v) => set({ weekStart: v === "once" ? week : null })}
          options={[
            { value: "weekly", label: F.weekly },
            { value: "once", label: F.once },
          ]}
        />
      )}
      <DialogFooter className="gap-2 sm:justify-between">
        {d.id ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={remove} disabled={busy}>
            <Trash2 data-icon="inline-start" aria-hidden />
            {A.remove}
          </Button>
        ) : (
          <span />
        )}
        <span className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t.common.save}
          </Button>
        </span>
      </DialogFooter>
    </form>
  )
}
