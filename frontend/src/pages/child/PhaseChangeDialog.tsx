import { useState, type FormEvent } from "react"
import { ArrowRightLeft, Check, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { TextareaField } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useT } from "@/i18n/context"
import { allowedPhaseTargets } from "@/lib/access"
import { PHASE_DOT } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import { PHASES, type Child, type PhaseId } from "@/types"

/** « Changer de phase » : seuls les passages autorisés sont cliquables ; commentaire obligatoire ; toast. */
export function PhaseChangeDialog({ child, onChanged }: { child: Child; onChanged: (c: Child) => void }) {
  const t = useT()
  const p = t.pages.child.phaseChange
  const current = child.journey.phase
  const allowed = allowedPhaseTargets(current)
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<PhaseId | null>(null)
  const [comment, setComment] = useState("")
  const [errors, setErrors] = useState<{ target?: string; comment?: string }>({})
  const [saving, setSaving] = useState(false)

  const reset = (o: boolean) => {
    setOpen(o)
    if (o) {
      setTarget(allowed.length === 1 ? allowed[0] : null)
      setComment("")
      setErrors({})
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = {
      target: target === null ? p.chooseRequired : undefined,
      comment: comment.trim() ? undefined : p.commentRequired,
    }
    setErrors(errs)
    if (errs.target || errs.comment || target === null) return
    setSaving(true)
    try {
      const updated = await api.setPhase(child.id, target, comment)
      onChanged(updated)
      setOpen(false)
      toast.success(p.done(child.identity.firstName, t.phases.long[target]))
    } catch {
      toast.error(p.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => reset(true)}>
        <ArrowRightLeft data-icon="inline-start" aria-hidden />
        {p.open}
      </Button>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-lg">
          <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-ink">{p.title}</DialogTitle>
              <DialogDescription className="text-sm text-ink-muted">{p.description}</DialogDescription>
            </DialogHeader>

            <div
              role="radiogroup"
              aria-label={t.phases.label}
              aria-describedby={errors.target ? "phase-target-error" : undefined}
              className="flex flex-col gap-2"
            >
              {PHASES.map((ph) => {
                const isCurrent = ph === current
                const enabled = allowed.includes(ph)
                const selected = target === ph
                return (
                  <button
                    key={ph}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-disabled={!enabled}
                    disabled={!enabled}
                    onClick={() => enabled && setTarget(ph)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-start transition-colors",
                      selected && "border-teal bg-teal-soft ring-2 ring-teal/30",
                      !selected && enabled && "border-line bg-surface hover:border-teal",
                      !enabled && "cursor-not-allowed border-dashed border-line bg-muted/40 text-ink-muted",
                    )}
                  >
                    <span aria-hidden className={cn("size-3 shrink-0 rounded-full", PHASE_DOT[ph], !enabled && !isCurrent && "opacity-40")} />
                    <span className="flex-1">
                      <span className={cn("block text-sm font-medium", enabled || isCurrent ? "text-ink" : "text-ink-muted")}>
                        {ph} · {t.phases.long[ph]}
                      </span>
                      {isCurrent && <span className="block text-xs text-ink-muted">{p.current}</span>}
                      {!enabled && !isCurrent && <span className="sr-only">{p.notAllowed}</span>}
                    </span>
                    {selected ? (
                      <Check className="size-5 text-teal" aria-hidden />
                    ) : !enabled && !isCurrent ? (
                      <Lock className="size-4 text-ink-muted" aria-hidden />
                    ) : null}
                  </button>
                )
              })}
              {errors.target && (
                <p id="phase-target-error" className="text-sm font-medium text-destructive">
                  {errors.target}
                </p>
              )}
            </div>

            <TextareaField
              label={`${p.comment} *`}
              hint={p.commentHint}
              value={comment}
              onChange={setComment}
              error={errors.comment}
            />

            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {saving ? p.submitting : p.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
