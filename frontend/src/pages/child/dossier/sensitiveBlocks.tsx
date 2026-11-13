// Blocs sensibles (repliés, ouverture tracée) tenus par le social et le psy : Santé, Situation judiciaire.
import { HeartPulse, Plus, Scale, Trash2 } from "lucide-react"
import * as api from "@/api"
import { CheckboxField, FieldGroup, SelectField, TagsField, TextField } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/context"
import { formatDate } from "@/lib/format"
import { BLOOD_GROUPS } from "@/lib/reference"
import { isBlank, isFutureDate, type Errors } from "@/lib/validation"
import type { Health, LegalMeasure, LegalSituation } from "@/types"
import { BlockCard, type BlockProps } from "./BlockCard"
import { InfoList, Tags } from "./InfoList"

const audit = (childId: string, block: "health" | "legal") => () => void api.logBlockOpened(childId, block)

export function HealthCard(props: BlockProps) {
  const { t } = useI18n()
  const L = t.pages.child.health
  const c = t.pages.child.cards
  const h = props.child.health

  return (
    <BlockCard
      {...props}
      block="health"
      icon={HeartPulse}
      collapsible
      sensitive
      onOpen={audit(props.child.id, "health")}
      validate={(d: Health): Errors => ({ bloodGroup: isBlank(d.bloodGroup) ? c.required : undefined })}
      form={(d, set, e) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField<string>
              label={L.bloodGroup}
              value={d.bloodGroup || null}
              onChange={(v) => set((x) => ({ ...x, bloodGroup: v }))}
              options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))}
              error={e.bloodGroup}
            />
            <TextField label={L.doctor} value={d.doctor} onChange={(v) => set((x) => ({ ...x, doctor: v }))} />
          </div>
          <TagsField label={L.allergies} values={d.allergies} onChange={(v) => set((x) => ({ ...x, allergies: v }))} />
          <TagsField label={L.chronic} values={d.chronicConditions} onChange={(v) => set((x) => ({ ...x, chronicConditions: v }))} />
          <TagsField label={L.treatments} values={d.treatments} onChange={(v) => set((x) => ({ ...x, treatments: v }))} />
          <TextField label={L.disability} value={d.disability ?? ""} onChange={(v) => set((x) => ({ ...x, disability: v.trim() ? v : null }))} />
          <CheckboxField label={L.vaccinationLabel} checked={d.vaccinationUpToDate} onChange={(v) => set((x) => ({ ...x, vaccinationUpToDate: v }))} />
        </>
      )}
    >
      <InfoList
        items={[
          { label: L.bloodGroup, value: h.bloodGroup },
          {
            label: L.vaccination,
            value: <span className={h.vaccinationUpToDate ? "" : "font-medium text-destructive"}>{h.vaccinationUpToDate ? L.vaccinationOk : L.vaccinationKo}</span>,
          },
          { label: L.allergies, value: <Tags values={h.allergies} empty={c.noneFemale} /> },
          { label: L.chronic, value: <Tags values={h.chronicConditions} empty={c.noneFemale} /> },
          { label: L.treatments, value: <Tags values={h.treatments} empty={c.none} /> },
          { label: L.disability, value: h.disability ?? <span className="text-ink-muted">{L.noDisability}</span> },
          { label: L.doctor, value: h.doctor || "—", wide: true },
        ]}
      />
    </BlockCard>
  )
}

const emptyMeasure = (): LegalMeasure => ({
  type: "",
  authority: "",
  startDate: "",
  endDate: null,
  center: null,
  ongoingFollowUp: false,
})

export function LegalCard(props: BlockProps) {
  const { t, intlLocale } = useI18n()
  const L = t.pages.child.legal
  const c = t.pages.child.cards
  const g = props.child.legal

  const validate = (d: LegalSituation): Errors => {
    const e: Errors = {}
    if (!d.hasMeasure) return e
    d.measures.forEach((m, i) => {
      e[`${i}.type`] = isBlank(m.type) ? c.required : undefined
      e[`${i}.authority`] = isBlank(m.authority) ? c.required : undefined
      e[`${i}.startDate`] = isBlank(m.startDate) ? c.required : isFutureDate(m.startDate) ? c.futureDate : undefined
      e[`${i}.endDate`] = m.endDate && m.startDate && m.endDate < m.startDate ? c.endBeforeStart : undefined
    })
    return e
  }

  return (
    <BlockCard
      {...props}
      block="legal"
      icon={Scale}
      collapsible
      sensitive
      onOpen={audit(props.child.id, "legal")}
      validate={validate}
      form={(d, set, e) => {
        const patch = (i: number, m: Partial<LegalMeasure>) =>
          set((x) => ({ ...x, measures: x.measures.map((y, j) => (j === i ? { ...y, ...m } : y)) }))
        return (
          <>
            <CheckboxField
              label={L.hasMeasureLabel}
              checked={d.hasMeasure}
              onChange={(v) => set((x) => ({ ...x, hasMeasure: v, measures: v && !x.measures.length ? [emptyMeasure()] : x.measures }))}
            />
            {d.hasMeasure && (
              <>
                {d.measures.map((m, i) => (
                  <FieldGroup key={i} legend={L.measure(i + 1)}>
                    <TextField label={L.type} value={m.type} onChange={(v) => patch(i, { type: v })} error={e[`${i}.type`]} />
                    <TextField label={L.authority} value={m.authority} onChange={(v) => patch(i, { authority: v })} error={e[`${i}.authority`]} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField label={L.startDate} type="date" value={m.startDate} onChange={(v) => patch(i, { startDate: v })} error={e[`${i}.startDate`]} />
                      <TextField label={L.endDate} type="date" value={m.endDate ?? ""} onChange={(v) => patch(i, { endDate: v || null })} error={e[`${i}.endDate`]} />
                    </div>
                    <TextField label={L.center} value={m.center ?? ""} onChange={(v) => patch(i, { center: v.trim() ? v : null })} />
                    <CheckboxField label={L.followUpLabel} checked={m.ongoingFollowUp} onChange={(v) => patch(i, { ongoingFollowUp: v })} />
                    {d.measures.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-fit text-destructive"
                        onClick={() => set((x) => ({ ...x, measures: x.measures.filter((_, j) => j !== i) }))}
                      >
                        <Trash2 data-icon="inline-start" aria-hidden />
                        {c.remove}
                      </Button>
                    )}
                  </FieldGroup>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={() => set((x) => ({ ...x, measures: [...x.measures, emptyMeasure()] }))}
                >
                  <Plus data-icon="inline-start" aria-hidden />
                  {L.addMeasure}
                </Button>
              </>
            )}
          </>
        )
      }}
    >
      <InfoList items={[{ label: L.hasMeasure, value: g.hasMeasure ? t.common.yes : t.common.no, wide: true }]} />
      {g.hasMeasure &&
        g.measures.map((m, i) => (
          <div key={i} className="mt-4 rounded-xl border border-line p-4">
            <InfoList
              items={[
                { label: L.type, value: m.type, wide: true },
                { label: L.authority, value: m.authority, wide: true },
                { label: L.startDate, value: m.startDate ? formatDate(m.startDate, intlLocale) : "—" },
                { label: L.endDate, value: m.endDate ? formatDate(m.endDate, intlLocale) : L.ongoing },
                { label: L.center, value: m.center ?? "—" },
                { label: L.followUp, value: m.ongoingFollowUp ? t.common.yes : t.common.no },
              ]}
            />
          </div>
        ))}
    </BlockCard>
  )
}
