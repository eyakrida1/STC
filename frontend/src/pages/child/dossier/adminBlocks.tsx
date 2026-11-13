// Blocs tenus par l'intervenant social : Identité, Parcours, Famille, Situation économique, Consentement.
import { Coins, FileCheck, IdCard, Plus, Route, Trash2, UsersRound } from "lucide-react"
import { CheckboxField, FieldGroup, PhaseBadge, SelectField, TextField } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/context"
import { childPortraitSrc } from "@/lib/avatar"
import { ageFrom, formatDate, formatDateLong } from "@/lib/format"
import { GOUVERNORATS } from "@/lib/reference"
import { isBlank, isFutureDate, isValidPhone, type Errors } from "@/lib/validation"
import type {
  AidApplication,
  AidProgram,
  AidStatus,
  ChildStatus,
  Consent,
  EconomicSituation,
  Family,
  Housing,
  Identity,
  Journey,
  Parent,
  ReferralSource,
  Sex,
} from "@/types"
import { BlockCard, type BlockProps } from "./BlockCard"
import { InfoList, Phone } from "./InfoList"

function useLabels() {
  const { t, intlLocale } = useI18n()
  return { t, p: t.pages.child, c: t.pages.child.cards, intlLocale }
}

// ───────────────────────────── Identité
export function IdentityCard(props: BlockProps) {
  const { t, p, c, intlLocale } = useLabels()
  const id = props.child.identity
  const L = p.identity

  const validate = (d: Identity): Errors => ({
    firstName: isBlank(d.firstName) ? c.required : undefined,
    lastName: isBlank(d.lastName) ? c.required : undefined,
    birthDate: isBlank(d.birthDate) ? c.required : isFutureDate(d.birthDate) ? c.futureDate : undefined,
    gouvernorat: isBlank(d.gouvernorat) ? c.required : undefined,
    language: isBlank(d.language) ? c.required : undefined,
  })

  return (
    <BlockCard
      {...props}
      block="identity"
      icon={IdCard}
      validate={validate}
      form={(d, set, e) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={L.firstName} value={d.firstName} onChange={(v) => set((x) => ({ ...x, firstName: v }))} error={e.firstName} />
            <TextField label={L.lastName} value={d.lastName} onChange={(v) => set((x) => ({ ...x, lastName: v }))} error={e.lastName} />
            <TextField label={L.birthDate} type="date" value={d.birthDate} onChange={(v) => set((x) => ({ ...x, birthDate: v }))} error={e.birthDate} />
            <SelectField<Sex>
              label={L.sex}
              value={d.sex}
              onChange={(v) => set((x) => ({ ...x, sex: v }))}
              options={(["F", "M"] as Sex[]).map((s) => ({ value: s, label: p.sex[s] }))}
            />
            <SelectField<string>
              label={L.gouvernorat}
              value={d.gouvernorat || null}
              onChange={(v) => set((x) => ({ ...x, gouvernorat: v }))}
              options={GOUVERNORATS.map((g) => ({ value: g, label: g }))}
              error={e.gouvernorat}
            />
            <TextField label={L.language} value={d.language} onChange={(v) => set((x) => ({ ...x, language: v }))} error={e.language} />
          </div>
          <TextField label={L.address} value={d.address} onChange={(v) => set((x) => ({ ...x, address: v }))} />
          <p className="text-xs text-ink-muted">{L.photoHint}</p>
        </>
      )}
    >
      <div className="flex items-start gap-4">
        <img
          src={childPortraitSrc(id)}
          alt={L.photo}
          className="size-16 shrink-0 rounded-full border border-line bg-muted object-cover"
        />
        <InfoList
          className="flex-1"
          items={[
            { label: L.code, value: <span className="font-mono">{props.child.code}</span> },
            { label: L.sex, value: p.sex[id.sex] },
          ]}
        />
      </div>
      <InfoList
        className="mt-4"
        items={[
          { label: L.lastName, value: id.lastName },
          { label: L.firstName, value: id.firstName },
          {
            label: L.birthDate,
            value: (
              <>
                {formatDateLong(id.birthDate, intlLocale)} <span className="text-ink-muted">{L.ageSuffix(ageFrom(id.birthDate))}</span>
              </>
            ),
          },
          { label: L.gouvernorat, value: id.gouvernorat },
          { label: L.address, value: id.address || <span className="text-ink-muted">{t.common.notProvided}</span>, wide: true },
          { label: L.language, value: id.language },
        ]}
      />
    </BlockCard>
  )
}

// ───────────────────────────── Parcours
export function JourneyCard(props: BlockProps) {
  const { t, p, c, intlLocale } = useLabels()
  const j = props.child.journey
  const L = p.journey
  const previous = j.stays.slice(0, -1)

  const validate = (d: Journey): Errors => ({
    entryDate: isBlank(d.entryDate) ? c.required : isFutureDate(d.entryDate) ? c.futureDate : undefined,
  })

  return (
    <BlockCard
      {...props}
      block="journey"
      icon={Route}
      validate={validate}
      editDescription={L.staysHint}
      form={(d, set, e) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField<ChildStatus>
            label={L.status}
            value={d.status}
            onChange={(v) => set((x) => ({ ...x, status: v }))}
            options={(["present", "sorti"] as ChildStatus[]).map((s) => ({ value: s, label: t.childStatus[s] }))}
          />
          <TextField
            label={L.entryDate}
            type="date"
            value={d.entryDate}
            onChange={(v) =>
              set((x) => ({
                ...x,
                entryDate: v,
                stays: x.stays.map((s, i) => (i === x.stays.length - 1 ? { ...s, entryDate: v } : s)),
              }))
            }
            error={e.entryDate}
          />
          <SelectField<ReferralSource>
            className="sm:col-span-2"
            label={L.referredBy}
            value={d.referredBy}
            onChange={(v) => set((x) => ({ ...x, referredBy: v }))}
            options={(Object.keys(t.referral) as ReferralSource[]).map((r) => ({ value: r, label: t.referral[r] }))}
          />
        </div>
      )}
    >
      <InfoList
        items={[
          { label: L.phase, value: <PhaseBadge phase={j.phase} variant="long" /> , wide: true },
          { label: L.status, value: t.childStatus[j.status] },
          { label: L.entryDate, value: formatDateLong(j.entryDate, intlLocale) },
          { label: L.referredBy, value: t.referral[j.referredBy], wide: true },
          {
            label: L.previousStays,
            wide: true,
            value: previous.length ? (
              <ul className="flex flex-col gap-1">
                {previous.map((s) => (
                  <li key={s.id}>
                    {L.stay(formatDate(s.entryDate, intlLocale), s.exitDate ? formatDate(s.exitDate, intlLocale) : "—")}
                    {s.exitDestination && <span className="text-ink-muted"> · {L.exitTo(t.exitDestinations[s.exitDestination].toLowerCase())}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-ink-muted">{L.noPreviousStay}</span>
            ),
          },
        ]}
      />
    </BlockCard>
  )
}

// ───────────────────────────── Famille
function ParentFields({
  legend,
  value,
  onChange,
  errors,
  prefix,
}: {
  legend: string
  value: Parent
  onChange: (p: Parent) => void
  errors: Errors
  prefix: string
}) {
  const { p } = useLabels()
  const L = p.family
  return (
    <FieldGroup legend={legend}>
      <TextField label={L.fullName} value={value.fullName} onChange={(v) => onChange({ ...value, fullName: v })} error={errors[`${prefix}.fullName`]} />
      <CheckboxField label={L.alive} checked={value.alive} onChange={(v) => onChange({ ...value, alive: v })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={L.profession} value={value.profession} onChange={(v) => onChange({ ...value, profession: v })} />
        <TextField
          label={L.phone}
          type="tel"
          inputMode="tel"
          value={value.phone ?? ""}
          onChange={(v) => onChange({ ...value, phone: v || null })}
          error={errors[`${prefix}.phone`]}
        />
      </div>
    </FieldGroup>
  )
}

export function FamilyCard(props: BlockProps) {
  const { p, c } = useLabels()
  const f = props.child.family
  const L = p.family

  const phoneErr = (v: string | null, required = false) =>
    !v || !v.trim() ? (required ? c.required : undefined) : isValidPhone(v) ? undefined : c.invalidPhone

  const validate = (d: Family): Errors => {
    const e: Errors = {
      "father.fullName": isBlank(d.father.fullName) ? c.required : undefined,
      "father.phone": phoneErr(d.father.phone),
      "mother.fullName": isBlank(d.mother.fullName) ? c.required : undefined,
      "mother.phone": phoneErr(d.mother.phone),
      "guardian.fullName": isBlank(d.guardian.fullName) ? c.required : undefined,
      "guardian.relation": isBlank(d.guardian.relation) ? c.required : undefined,
      "guardian.phone": phoneErr(d.guardian.phone, true),
      "emergency.fullName": isBlank(d.emergencyContact.fullName) ? c.required : undefined,
      "emergency.phone": phoneErr(d.emergencyContact.phone, true),
    }
    d.siblings.forEach((s, i) => {
      e[`sibling.${i}.firstName`] = isBlank(s.firstName) ? c.required : undefined
      e[`sibling.${i}.age`] = Number.isInteger(s.age) && s.age >= 0 && s.age < 40 ? undefined : c.invalidNumber
    })
    return e
  }

  const parent = (x: Parent) => (
    <>
      {x.fullName}
      <span className="text-ink-muted"> · {x.alive ? L.alive.toLowerCase() : L.deceased.toLowerCase()}</span>
      {x.profession && x.profession !== "—" && <span className="block text-sm text-ink-muted">{x.profession}</span>}
      {x.phone && (
        <span className="block text-sm">
          <Phone value={x.phone} />
        </span>
      )}
    </>
  )

  return (
    <BlockCard
      {...props}
      block="family"
      icon={UsersRound}
      validate={validate}
      form={(d, set, e) => (
        <>
          <ParentFields legend={L.father} prefix="father" value={d.father} errors={e} onChange={(v) => set((x) => ({ ...x, father: v }))} />
          <ParentFields legend={L.mother} prefix="mother" value={d.mother} errors={e} onChange={(v) => set((x) => ({ ...x, mother: v }))} />
          <FieldGroup legend={L.guardian}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={L.fullName} value={d.guardian.fullName} onChange={(v) => set((x) => ({ ...x, guardian: { ...x.guardian, fullName: v } }))} error={e["guardian.fullName"]} />
              <TextField label={L.relation} value={d.guardian.relation} onChange={(v) => set((x) => ({ ...x, guardian: { ...x.guardian, relation: v } }))} error={e["guardian.relation"]} />
              <TextField label={L.phone} type="tel" inputMode="tel" value={d.guardian.phone} onChange={(v) => set((x) => ({ ...x, guardian: { ...x.guardian, phone: v } }))} error={e["guardian.phone"]} />
            </div>
          </FieldGroup>
          <FieldGroup legend={L.siblings}>
            {d.siblings.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_auto] items-end gap-2">
                <TextField
                  label={L.siblingName}
                  value={s.firstName}
                  onChange={(v) => set((x) => ({ ...x, siblings: x.siblings.map((y, j) => (j === i ? { ...y, firstName: v } : y)) }))}
                  error={e[`sibling.${i}.firstName`]}
                />
                <TextField
                  label={L.siblingAge}
                  type="number"
                  inputMode="numeric"
                  value={Number.isNaN(s.age) ? "" : String(s.age)}
                  onChange={(v) => set((x) => ({ ...x, siblings: x.siblings.map((y, j) => (j === i ? { ...y, age: v === "" ? NaN : Number(v) } : y)) }))}
                  error={e[`sibling.${i}.age`]}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-0.5 self-end"
                  aria-label={`${c.remove} ${s.firstName}`}
                  onClick={() => set((x) => ({ ...x, siblings: x.siblings.filter((_, j) => j !== i) }))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() => set((x) => ({ ...x, siblings: [...x.siblings, { firstName: "", age: NaN, sex: "M" }] }))}
            >
              <Plus data-icon="inline-start" aria-hidden />
              {L.addSibling}
            </Button>
          </FieldGroup>
          <FieldGroup legend={L.emergency}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={L.fullName} value={d.emergencyContact.fullName} onChange={(v) => set((x) => ({ ...x, emergencyContact: { ...x.emergencyContact, fullName: v } }))} error={e["emergency.fullName"]} />
              <TextField label={L.relation} value={d.emergencyContact.relation} onChange={(v) => set((x) => ({ ...x, emergencyContact: { ...x.emergencyContact, relation: v } }))} />
              <TextField label={L.phone} type="tel" inputMode="tel" value={d.emergencyContact.phone} onChange={(v) => set((x) => ({ ...x, emergencyContact: { ...x.emergencyContact, phone: v } }))} error={e["emergency.phone"]} />
            </div>
          </FieldGroup>
        </>
      )}
    >
      <InfoList
        items={[
          { label: L.father, value: parent(f.father) },
          { label: L.mother, value: parent(f.mother) },
          {
            label: L.guardian,
            value: (
              <>
                {f.guardian.fullName} <span className="text-ink-muted">({f.guardian.relation.toLowerCase()})</span>
                <span className="block text-sm">
                  <Phone value={f.guardian.phone} />
                </span>
              </>
            ),
          },
          {
            label: L.emergency,
            value: (
              <>
                {f.emergencyContact.fullName} <span className="text-ink-muted">({f.emergencyContact.relation.toLowerCase()})</span>
                <span className="block text-sm">
                  <Phone value={f.emergencyContact.phone} />
                </span>
              </>
            ),
          },
          {
            label: L.siblings,
            wide: true,
            value: f.siblings.length ? f.siblings.map((s) => L.sibling(s.firstName, s.age)).join(" · ") : <span className="text-ink-muted">{L.noSiblings}</span>,
          },
        ]}
      />
    </BlockCard>
  )
}

// ───────────────────────────── Situation économique
const AID_STATUS_STYLE: Record<AidStatus, string> = {
  a_preparer: "bg-muted text-ink",
  depose: "bg-phase-1-soft text-phase-1-ink",
  accorde: "bg-phase-5-soft text-phase-5-ink",
  refuse: "bg-destructive/10 text-destructive",
}

export function EconomicCard(props: BlockProps & { aids: AidApplication[]; programs: AidProgram[] }) {
  const { t, p, c } = useLabels()
  const eco = props.child.economic
  const L = p.economic
  const current = props.aids.filter((a) => a.status !== "refuse")

  const validate = (d: EconomicSituation): Errors => ({
    monthlyIncomeTnd: Number.isFinite(d.monthlyIncomeTnd) && d.monthlyIncomeTnd >= 0 ? undefined : c.invalidNumber,
    householdSize: Number.isInteger(d.householdSize) && d.householdSize >= 1 ? undefined : c.invalidNumber,
  })

  return (
    <BlockCard
      {...props}
      block="economic"
      icon={Coins}
      validate={validate}
      editDescription={L.aidsHint}
      form={(d, set, e) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={`${L.income} (${L.incomeUnit})`}
            type="number"
            inputMode="numeric"
            value={Number.isNaN(d.monthlyIncomeTnd) ? "" : String(d.monthlyIncomeTnd)}
            onChange={(v) => set((x) => ({ ...x, monthlyIncomeTnd: v === "" ? NaN : Number(v) }))}
            error={e.monthlyIncomeTnd}
          />
          <TextField
            label={L.householdSize}
            type="number"
            inputMode="numeric"
            value={Number.isNaN(d.householdSize) ? "" : String(d.householdSize)}
            onChange={(v) => set((x) => ({ ...x, householdSize: v === "" ? NaN : Number(v) }))}
            error={e.householdSize}
          />
          <SelectField<Housing>
            className="sm:col-span-2"
            label={L.housing}
            value={d.housing}
            onChange={(v) => set((x) => ({ ...x, housing: v }))}
            options={(Object.keys(t.housing) as Housing[]).map((h) => ({ value: h, label: t.housing[h] }))}
          />
        </div>
      )}
    >
      <InfoList
        items={[
          { label: L.income, value: L.incomeValue(eco.monthlyIncomeTnd) },
          { label: L.householdSize, value: eco.householdSize },
          { label: L.housing, value: t.housing[eco.housing], wide: true },
          {
            label: L.aids,
            wide: true,
            value: current.length ? (
              <ul className="flex flex-col gap-2">
                {current.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2">
                    <span>{props.programs.find((pr) => pr.id === a.programId)?.label ?? a.programId}</span>
                    <span className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ${AID_STATUS_STYLE[a.status]}`}>
                      {t.aids[a.status]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-ink-muted">{L.noAids}</span>
            ),
          },
        ]}
      />
    </BlockCard>
  )
}

// ───────────────────────────── Consentement
export function ConsentCard(props: BlockProps) {
  const { p, c, intlLocale } = useLabels()
  const k = props.child.consent
  const L = p.consent

  const validate = (d: Consent): Errors =>
    d.given
      ? {
          by: isBlank(d.by) ? c.required : undefined,
          date: !d.date ? c.required : isFutureDate(d.date) ? c.futureDate : undefined,
        }
      : {}

  return (
    <BlockCard
      {...props}
      block="consent"
      icon={FileCheck}
      validate={validate}
      form={(d, set, e) => (
        <>
          <CheckboxField label={L.givenLabel} checked={d.given} onChange={(v) => set((x) => ({ ...x, given: v }))} />
          {d.given && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={L.by} value={d.by} onChange={(v) => set((x) => ({ ...x, by: v }))} error={e.by} />
              <TextField label={L.date} type="date" value={d.date ?? ""} onChange={(v) => set((x) => ({ ...x, date: v || null }))} error={e.date} />
            </div>
          )}
        </>
      )}
    >
      <InfoList
        items={[
          {
            label: L.given,
            value: (
              <span className={k.given ? "font-medium text-phase-5-ink" : "font-medium text-destructive"}>{k.given ? L.yes : L.no}</span>
            ),
          },
          { label: L.date, value: k.date ? formatDateLong(k.date, intlLocale) : "—" },
          { label: L.by, value: k.by || "—", wide: true },
        ]}
      />
    </BlockCard>
  )
}
