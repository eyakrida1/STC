// Blocs tenus par l'éducateur : Scolarité, Intérêts et compétences.
import { GraduationCap, Sparkles } from "lucide-react"
import { SelectField, TagsField, TextareaField, TextField } from "@/components/cdis"
import { useT } from "@/i18n/context"
import { MAX_BUBBLES } from "@/lib/bubbles"
import { cn } from "@/lib/utils"
import { isBlank, type Errors } from "@/lib/validation"
import { SCHOOL_GRADES, type Interests, type SchoolGrade, type Schooling } from "@/types"
import { BlockCard, type BlockProps } from "./BlockCard"
import { InfoList, Tags } from "./InfoList"

// ───────────────────────────── Visuel « niveau nominal vs niveau réel »
const SCALE_MAX = 13

function LevelBar({ label, grade, tone }: { label: string; grade: SchoolGrade | null; tone: "nominal" | "actual" }) {
  const t = useT()
  const L = t.pages.child.schooling
  const pct = grade ? (grade / SCALE_MAX) * 100 : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-muted">{grade ? t.pages.child.grades[grade] : L.toEvaluate}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-muted">
        {grade && (
          <div
            className={cn("absolute inset-y-0 start-0 rounded-full", tone === "nominal" ? "bg-ink-muted/60" : "bg-teal")}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  )
}

function LevelChart({ s }: { s: Schooling }) {
  const t = useT()
  const L = t.pages.child.schooling
  const gap = s.nominalGrade && s.actualGrade ? s.nominalGrade - s.actualGrade : null
  const g = t.pages.child.grades
  return (
    <figure
      className="flex flex-col gap-3 rounded-xl bg-sand p-4"
      aria-label={L.chartLabel(s.nominalGrade ? g[s.nominalGrade] : L.toEvaluate, s.actualGrade ? g[s.actualGrade] : L.toEvaluate)}
    >
      <LevelBar label={L.nominal} grade={s.nominalGrade} tone="nominal" />
      <LevelBar label={L.actual} grade={s.actualGrade} tone="actual" />
      {/* graduations : 9 années de base + 4 années de secondaire */}
      <div aria-hidden className="flex justify-between text-xs text-ink-muted">
        <span>{L.scaleStart}</span>
        <span>{L.scaleEnd}</span>
      </div>
      {gap !== null && (
        <figcaption
          className={cn(
            "w-fit rounded-full px-2.5 py-0.5 text-sm font-semibold",
            gap > 0 ? "bg-mood-2/15 text-ink" : "bg-phase-5-soft text-phase-5-ink",
          )}
        >
          {L.gap(gap)}
        </figcaption>
      )}
    </figure>
  )
}

export function SchoolingCard(props: BlockProps) {
  const t = useT()
  const c = t.pages.child.cards
  const L = t.pages.child.schooling
  const s = props.child.schooling
  const gradeOptions = SCHOOL_GRADES.map((g) => ({ value: g, label: t.pages.child.grades[g] }))

  const validate = (d: Schooling): Errors => ({
    lastSchool: isBlank(d.lastSchool) ? c.required : undefined,
    nominalGrade: d.nominalGrade ? undefined : c.required,
  })

  return (
    <BlockCard
      {...props}
      block="schooling"
      icon={GraduationCap}
      validate={validate}
      form={(d, set, e) => (
        <>
          <TextField label={L.lastSchool} value={d.lastSchool} onChange={(v) => set((x) => ({ ...x, lastSchool: v }))} error={e.lastSchool} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField<SchoolGrade>
              label={L.nominal}
              hint={L.nominalHint}
              value={d.nominalGrade}
              onChange={(v) => set((x) => ({ ...x, nominalGrade: v }))}
              options={gradeOptions}
              error={e.nominalGrade}
            />
            <SelectField<SchoolGrade | 0>
              label={L.actual}
              hint={L.actualHint}
              value={d.actualGrade ?? 0}
              onChange={(v) => set((x) => ({ ...x, actualGrade: v === 0 ? null : v }))}
              options={[{ value: 0 as const, label: L.toEvaluate }, ...gradeOptions]}
            />
          </div>
          <LevelChart s={d} />
        </>
      )}
    >
      <InfoList items={[{ label: L.lastSchool, value: s.lastSchool, wide: true }]} />
      <div className="mt-4">
        <LevelChart s={s} />
      </div>
    </BlockCard>
  )
}

// ───────────────────────────── Intérêts et compétences
export function InterestsCard(props: BlockProps) {
  const t = useT()
  const L = t.pages.child.interests
  const c = t.pages.child.cards
  const it = props.child.interests

  return (
    <BlockCard
      {...props}
      block="interests"
      icon={Sparkles}
      validate={(): Errors => ({})}
      editDescription={L.bubblesHint}
      form={(d: Interests, set) => (
        <>
          <TagsField label={L.hobbies} values={d.hobbies} onChange={(v) => set((x) => ({ ...x, hobbies: v }))} max={MAX_BUBBLES} />
          <TagsField label={L.interests} values={d.interests} onChange={(v) => set((x) => ({ ...x, interests: v }))} max={MAX_BUBBLES} />
          <TagsField label={L.skills} values={d.skillsToDevelop} onChange={(v) => set((x) => ({ ...x, skillsToDevelop: v }))} max={MAX_BUBBLES} />
          <TextareaField label={L.wishes} value={d.wishes} onChange={(v) => set((x) => ({ ...x, wishes: v }))} />
        </>
      )}
    >
      <InfoList
        items={[
          { label: L.hobbies, value: <Tags values={it.hobbies} empty={c.none} /> },
          { label: L.interests, value: <Tags values={it.interests} empty={c.none} /> },
          { label: L.skills, value: <Tags values={it.skillsToDevelop} empty={c.noneFemale} />, wide: true },
          {
            label: L.wishes,
            wide: true,
            value: it.wishes ? (
              <blockquote className="border-s-4 border-teal/40 ps-3 text-base text-ink italic">« {it.wishes} »</blockquote>
            ) : (
              <span className="text-ink-muted">{L.noWishes}</span>
            ),
          },
        ]}
      />
    </BlockCard>
  )
}
