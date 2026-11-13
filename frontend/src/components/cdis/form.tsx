/**
 * Champs de formulaire CDIS : libellé visible, aide, erreur reliée par aria-describedby, cibles ≥ 44 px.
 * Utilisés dans les panneaux « Modifier » (Sheet). Sobres : pas de pop.
 */
import { useId, useState, type ReactNode } from "react"
import { ChevronDown, Plus, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useT } from "@/i18n/context"
import { cn } from "@/lib/utils"

interface FieldIds {
  id: string
  describedBy: string | undefined
  invalid: true | undefined
}

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  className?: string
  children: (ids: FieldIds) => ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, describedBy, invalid: error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type Common = { label: ReactNode; hint?: ReactNode; error?: string | null; className?: string }

export function TextField({
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  ...common
}: Common & {
  value: string
  onChange: (v: string) => void
  type?: "text" | "tel" | "email" | "date" | "number"
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  autoComplete?: string
  placeholder?: string
}) {
  return (
    <Field {...common}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete ?? "off"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </Field>
  )
}

export function TextareaField({
  value,
  onChange,
  rows = 3,
  ...common
}: Common & { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <Field {...common}>
      {({ id, describedBy, invalid }) => (
        <Textarea
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </Field>
  )
}

export function SelectField<T extends string | number>({
  value,
  onChange,
  options,
  placeholder,
  ...common
}: Common & {
  value: T | null
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  placeholder?: string
}) {
  return (
    <Field {...common}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <select
            id={id}
            value={value === null ? "" : String(value)}
            onChange={(e) => {
              const opt = options.find((o) => String(o.value) === e.target.value)
              if (opt) onChange(opt.value)
            }}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className="h-11 w-full appearance-none rounded-lg border border-input bg-surface ps-3 pe-10 text-base text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          >
            {value === null && <option value="">{placeholder ?? "—"}</option>}
            {options.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        </div>
      )}
    </Field>
  )
}

export function CheckboxField({
  checked,
  onChange,
  label,
  hint,
  className,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  hint?: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {/* Base UI relie la case à « {id}-label » (aria-labelledby) : le libellé porte donc cet id. */}
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-labelledby={`${id}-label`} className="mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
    </div>
  )
}

/** Liste de mots (hobbies, allergies…) : puces retirables + champ d'ajout (Entrée ou bouton). */
export function TagsField({
  values,
  onChange,
  max,
  ...common
}: Common & { values: string[]; onChange: (v: string[]) => void; max?: number }) {
  const t = useT()
  const [draft, setDraft] = useState("")
  const full = max !== undefined && values.length >= max
  const add = () => {
    const v = draft.trim()
    if (!v || full || values.some((x) => x.toLowerCase() === v.toLowerCase())) return
    onChange([...values, v])
    setDraft("")
  }
  return (
    <Field {...common} hint={common.hint ?? t.pages.child.cards.tagsHint}>
      {({ id, describedBy, invalid }) => (
        <div className="flex flex-col gap-2">
          {values.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {values.map((v) => (
                <li key={v} className="inline-flex h-8 items-center gap-1 rounded-full bg-muted ps-3 pe-1 text-sm text-ink">
                  {v}
                  <button
                    type="button"
                    onClick={() => onChange(values.filter((x) => x !== v))}
                    aria-label={`${t.pages.child.cards.remove} ${v}`}
                    className="grid size-6 place-items-center rounded-full text-ink-muted hover:bg-surface hover:text-ink"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              id={id}
              value={draft}
              disabled={full}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  add()
                }
              }}
              aria-describedby={describedBy}
              aria-invalid={invalid}
            />
            <button
              type="button"
              onClick={add}
              disabled={full || !draft.trim()}
              className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-muted disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden />
              {t.pages.child.cards.add}
            </button>
          </div>
        </div>
      )}
    </Field>
  )
}

/** Groupe de champs titré (ex. « Père », « Mère »). */
export function FieldGroup({ legend, children, className }: { legend: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("flex flex-col gap-4 rounded-xl border border-line p-4", className)}>
      <legend className="px-1 text-sm font-semibold text-ink">{legend}</legend>
      {children}
    </fieldset>
  )
}
