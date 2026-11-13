import { useState, type FormEvent, type ReactNode } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/i18n/context"
import { hasErrors, type Errors } from "@/lib/validation"

/**
 * Panneau latéral « Modifier » générique : brouillon local, validation à l'envoi, Annuler / Enregistrer, toast.
 * Le contenu n'est monté que panneau ouvert : le brouillon repart de la valeur enregistrée à chaque ouverture.
 */
export function EditSheet<T>({
  open,
  onOpenChange,
  title,
  description,
  initial,
  validate,
  save,
  savedMessage,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  initial: T
  validate: (draft: T) => Errors
  save: (draft: T) => Promise<void>
  savedMessage: string
  children: (draft: T, setDraft: (update: (d: T) => T) => void, errors: Errors) => ReactNode
}) {
  const { dir } = useI18n()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={dir === "rtl" ? "left" : "right"}
        className="w-full gap-0 bg-surface p-0 data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl"
      >
        {open && (
          <EditForm
            title={title}
            description={description}
            initial={initial}
            validate={validate}
            save={save}
            savedMessage={savedMessage}
            onDone={() => onOpenChange(false)}
          >
            {children}
          </EditForm>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EditForm<T>({
  title,
  description,
  initial,
  validate,
  save,
  savedMessage,
  onDone,
  children,
}: {
  title: string
  description?: string
  initial: T
  validate: (draft: T) => Errors
  save: (draft: T) => Promise<void>
  savedMessage: string
  onDone: () => void
  children: (draft: T, setDraft: (update: (d: T) => T) => void, errors: Errors) => ReactNode
}) {
  const { t } = useI18n()
  const c = t.pages.child.cards
  const [draft, setDraftState] = useState<T>(() => structuredClone(initial))
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  // Erreurs dérivées : après une première tentative, la validation se refait en direct à chaque frappe.
  const errors: Errors = submitted ? validate(draft) : {}

  const setDraft = (update: (d: T) => T) => setDraftState(update)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (hasErrors(validate(draft))) {
      setTimeout(() => document.querySelector<HTMLElement>("[data-edit-form] [aria-invalid=true]")?.focus(), 0)
      return
    }
    setSaving(true)
    try {
      await save(draft)
      toast.success(savedMessage)
      onDone()
    } catch {
      toast.error(c.saveError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate data-edit-form className="flex h-full min-h-0 flex-col">
      <SheetHeader className="border-b border-line p-5 pe-14 sm:p-6 sm:pe-14">
        <SheetTitle className="text-xl font-semibold text-ink">{title}</SheetTitle>
        {description && <SheetDescription className="text-sm text-ink-muted">{description}</SheetDescription>}
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
        {submitted && hasErrors(errors) && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {c.fixErrors}
          </p>
        )}
        {children(draft, setDraft, errors)}
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t border-line p-4 sm:p-5">
        <Button type="button" variant="ghost" onClick={onDone}>
          {c.cancel}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {saving ? c.saving : c.save}
        </Button>
      </SheetFooter>
    </form>
  )
}
