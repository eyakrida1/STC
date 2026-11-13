import { useState, type FormEvent } from "react"
import { HandCoins, Loader2, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { EmptyState, SelectField, TextareaField, TextField } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/i18n/context"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { isFutureDate, type Errors } from "@/lib/validation"
import type { AidApplication, AidProgram, AidStatus } from "@/types"

const AID_STATUS_STYLE: Record<AidStatus, string> = {
  a_preparer: "bg-muted text-ink",
  depose: "bg-phase-1-soft text-phase-1-ink",
  accorde: "bg-phase-5-soft text-phase-5-ink",
  refuse: "bg-destructive/10 text-destructive",
}
const STATUSES: AidStatus[] = ["a_preparer", "depose", "accorde", "refuse"]

type Draft = Omit<AidApplication, "id"> & { id?: string }

/** Intervenant social : programmes d'aide de la famille. Un changement de statut met à jour la carte « Situation économique ». */
export function AidsPanel({
  childId,
  aids,
  programs,
  onAidsChange,
}: {
  childId: string
  aids: AidApplication[]
  programs: AidProgram[]
  onAidsChange: (aids: AidApplication[]) => void
}) {
  const { t, intlLocale } = useI18n()
  const A = t.followup.aids
  const [editing, setEditing] = useState<Draft | null>(null)
  const label = (id: string) => programs.find((p) => p.id === id)?.label ?? id

  return (
    <section aria-labelledby="aids-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="aids-title" className="text-xl font-semibold text-ink">
            {A.title}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">{A.description}</p>
        </div>
        <Button
          size="lg"
          onClick={() =>
            setEditing({ childId, programId: programs[0]?.id ?? "", beneficiary: "famille", status: "a_preparer", submittedAt: null, decidedAt: null, missingDocuments: "" })
          }
        >
          <Plus data-icon="inline-start" aria-hidden />
          {A.enroll}
        </Button>
      </div>

      {aids.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={HandCoins} title={A.empty} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {aids.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{label(a.programId)}</p>
                  <p className="text-sm text-ink-muted">
                    {A.beneficiary} : {A.beneficiaries[a.beneficiary]}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", AID_STATUS_STYLE[a.status])}>{t.aids[a.status]}</span>
              </div>
              <dl className="grid gap-1 text-sm text-ink">
                <div>{a.submittedAt ? A.submittedOn(formatDate(a.submittedAt, intlLocale)) : <span className="text-ink-muted">{A.notSubmitted}</span>}</div>
                {a.decidedAt && <div>{A.decidedOn(formatDate(a.decidedAt, intlLocale))}</div>}
                <div>
                  <dt className="inline text-ink-muted">{A.missing} : </dt>
                  <dd className="inline">{a.missingDocuments || A.noMissing}</dd>
                </div>
              </dl>
              <Button variant="outline" className="w-fit" onClick={() => setEditing({ ...a })} aria-label={`${A.edit} : ${label(a.programId)}`}>
                <Pencil data-icon="inline-start" aria-hidden />
                {A.edit}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-lg">
          {editing && (
            <AidForm
              key={editing.id ?? "new"}
              initial={editing}
              programs={programs}
              onClose={() => setEditing(null)}
              onSaved={async () => {
                onAidsChange(await api.listAidApplications(childId))
                setEditing(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function AidForm({ initial, programs, onClose, onSaved }: { initial: Draft; programs: AidProgram[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const { t } = useI18n()
  const A = t.followup.aids
  const [d, setD] = useState<Draft>(initial)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const needsSubmit = d.status !== "a_preparer"
  const needsDecision = d.status === "accorde" || d.status === "refuse"

  const validate = (x: Draft): Errors => ({
    submittedAt:
      x.status !== "a_preparer" && !x.submittedAt ? A.submittedRequired : x.submittedAt && isFutureDate(x.submittedAt) ? t.pages.child.cards.futureDate : undefined,
    decidedAt:
      (x.status === "accorde" || x.status === "refuse") && !x.decidedAt
        ? A.decidedRequired
        : x.decidedAt && isFutureDate(x.decidedAt)
          ? t.pages.child.cards.futureDate
          : x.decidedAt && x.submittedAt && x.decidedAt < x.submittedAt
            ? A.decidedBeforeSubmitted
            : undefined,
  })
  const errors = submitted ? validate(d) : {}

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.values(validate(d)).some(Boolean)) return
    setBusy(true)
    try {
      await api.saveAidApplication({
        ...d,
        submittedAt: needsSubmit ? d.submittedAt : null,
        decidedAt: needsDecision ? d.decidedAt : null,
        missingDocuments: d.missingDocuments.trim(),
      })
      toast.success(A.saved)
      await onSaved()
    } catch {
      toast.error(A.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-ink">{d.id ? A.editTitle : A.newTitle}</DialogTitle>
        <DialogDescription className="text-sm text-ink-muted">{A.description}</DialogDescription>
      </DialogHeader>
      <SelectField<string> label={A.program} value={d.programId} onChange={(v) => set({ programId: v })} options={programs.map((p) => ({ value: p.id, label: p.label }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField<"enfant" | "famille">
          label={A.beneficiary}
          value={d.beneficiary}
          onChange={(v) => set({ beneficiary: v })}
          options={(["famille", "enfant"] as const).map((b) => ({ value: b, label: A.beneficiaries[b] }))}
        />
        <SelectField<AidStatus> label={A.status} value={d.status} onChange={(v) => set({ status: v })} options={STATUSES.map((s) => ({ value: s, label: t.aids[s] }))} />
        {needsSubmit && (
          <TextField label={A.submittedAt} type="date" value={d.submittedAt ?? ""} onChange={(v) => set({ submittedAt: v || null })} error={errors.submittedAt} />
        )}
        {needsDecision && (
          <TextField label={A.decidedAt} type="date" value={d.decidedAt ?? ""} onChange={(v) => set({ decidedAt: v || null })} error={errors.decidedAt} />
        )}
      </div>
      <TextareaField label={A.missing} value={d.missingDocuments} onChange={(v) => set({ missingDocuments: v })} rows={2} />
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
