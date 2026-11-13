import { useEffect, useId, useState, type FormEvent } from "react"
import { AlertCircle, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { useCurrentUser } from "@/auth/context"
import { ChildAvatar, RoleBadge, SelectField, TagsField, TextareaField, TextField } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/context"
import { emitDataChanged } from "@/lib/events"
import { formatDate, localISODate } from "@/lib/format"
import { OBSERVED_SKILLS } from "@/lib/reference"
import { cn } from "@/lib/utils"
import { isBlank, isFutureDate, type Errors } from "@/lib/validation"
import {
  MOOD_SCALE_KEYS,
  type AiNoteStatus,
  type Child,
  type ConsultationType,
  type MoodScales,
  type ProfessionalRole,
  type Session,
  type SessionDetails,
  type SessionResult,
  type VisitLocation,
} from "@/types"
import type { TeamMember } from "../ChildHero"
import { NoteZone } from "./NoteZone"
import { ScaleInput } from "./ScaleInput"

interface Draft {
  date: string
  durationMin: string
  type: ConsultationType
  scales: MoodScales
  location: VisitLocation
  peopleMet: string[]
  livingConditions: string
  context: string
  skillsObserved: string[]
  privateNote: string
  sharedText: string
  recipientIds: string[]
  aiNote: string
}

function draftFrom(session: Session | null, child: Child): Draft {
  const d = session?.details
  return {
    date: session?.date ?? localISODate(),
    durationMin: d?.kind === "consultation" ? String(d.durationMin) : d?.kind === "observation" && d.durationMin ? String(d.durationMin) : d ? "" : "45",
    type: d?.kind === "consultation" ? d.type : "suivi",
    scales:
      d?.kind === "consultation"
        ? { ...d.scales }
        : { humeur: child.mood.level, anxiete: 3, confiance: 3, colere: 3, relations: 3, motivation: 3 },
    location: d?.kind === "visite" ? d.location : "domicile",
    peopleMet: d?.kind === "visite" ? [...d.peopleMet] : [],
    livingConditions: d?.kind === "visite" ? d.livingConditions : "",
    context: d?.kind === "observation" ? d.context : "",
    skillsObserved: d?.kind === "observation" ? [...d.skillsObserved] : [],
    privateNote: session?.privateNote ?? "",
    sharedText: session?.sharedNote?.text ?? "",
    recipientIds: session?.sharedNote?.recipients.map((r) => r.userId) ?? [],
    aiNote: session?.aiNote?.text ?? "",
  }
}

function detailsFrom(role: ProfessionalRole, d: Draft): SessionDetails {
  if (role === "psychologue") return { kind: "consultation", durationMin: Number(d.durationMin), type: d.type, scales: d.scales }
  if (role === "social")
    return { kind: "visite", location: d.location, peopleMet: d.peopleMet, livingConditions: d.livingConditions.trim() }
  return {
    kind: "observation",
    context: d.context.trim(),
    durationMin: d.durationMin ? Number(d.durationMin) : null,
    skillsObserved: d.skillsObserved,
  }
}

/**
 * Formulaire de séance à 3 sorties, en panneau latéral large : on garde le dossier en arrière-plan
 * (l'intervenant voit toujours de quel enfant il parle). Création, ou correction pendant 24 h (`session`).
 */
export function SessionSheet({
  open,
  onOpenChange,
  child,
  team,
  session,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  child: Child
  team: TeamMember[]
  session: Session | null
  onSaved: (result: SessionResult) => void
}) {
  const { dir } = useI18n()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={dir === "rtl" ? "left" : "right"}
        className="w-full gap-0 bg-surface p-0 data-[side=left]:sm:max-w-3xl data-[side=right]:sm:max-w-3xl"
      >
        {open && <SessionForm child={child} team={team} session={session} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function SessionForm({
  child,
  team,
  session,
  onSaved,
  onClose,
}: {
  child: Child
  team: TeamMember[]
  session: Session | null
  onSaved: (result: SessionResult) => void
  onClose: () => void
}) {
  const { t, intlLocale } = useI18n()
  const S = t.sessions
  const F = S.form
  const user = useCurrentUser()
  const role = user.role as ProfessionalRole
  const label = S.space[role].one
  const editing = session !== null
  const ids = useId()

  const [draft, setDraft] = useState<Draft>(() => draftFrom(session, child))
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ai, setAi] = useState<AiNoteStatus | null>(null)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  useEffect(() => {
    api.getAiNoteStatus(child.id).then(setAi).catch(() => setAi(null))
  }, [child.id])

  const colleagues = team.filter((m) => m.id !== user.id)
  const delivered = new Set(session?.sharedNote?.recipients.map((r) => r.userId) ?? [])
  const aiFrozen = !!session?.aiNote?.consumedByProposalId
  const skillChoices = [...new Set([...child.interests.skillsToDevelop, ...OBSERVED_SKILLS])]

  // ── validation (dérivée : se met à jour en direct après la première tentative)
  const validate = (d: Draft): Errors => {
    const e: Errors = {}
    e.date = isBlank(d.date) ? t.pages.child.cards.required : isFutureDate(d.date) ? t.pages.child.cards.futureDate : undefined
    if (role === "psychologue") e.durationMin = Number(d.durationMin) > 0 && Number.isInteger(Number(d.durationMin)) ? undefined : F.positive
    if (role === "educateur") {
      e.context = isBlank(d.context) ? t.pages.child.cards.required : undefined
      e.durationMin = d.durationMin && !(Number(d.durationMin) > 0) ? F.positive : undefined
    }
    const hasShared = !isBlank(d.sharedText) && d.recipientIds.length > 0
    if (isBlank(d.privateNote) && !hasShared && isBlank(d.aiNote)) e.zones = F.atLeastOne
    if (session) {
      if (session.privateNote && isBlank(d.privateNote)) e.privateNote = F.cannotEmpty
      if (session.sharedNote && isBlank(d.sharedText)) e.sharedText = F.cannotEmpty
      if (session.aiNote && isBlank(d.aiNote)) e.aiNote = F.cannotEmpty
    }
    return e
  }
  const errors: Errors = submitted ? validate(draft) : {}
  const invalid = Object.values(errors).some(Boolean)

  const nameOf = (id: string) => {
    const m = team.find((x) => x.id === id)
    return m ? `${m.firstName} ${m.lastName}` : id
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.values(validate(draft)).some(Boolean)) {
      setTimeout(() => document.querySelector<HTMLElement>("[data-session-form] [aria-invalid=true], [data-session-form] [data-zone-error]")?.focus(), 0)
      return
    }
    setSaving(true)
    const payload = {
      date: draft.date,
      details: detailsFrom(role, draft),
      privateNote: draft.privateNote.trim() || null,
      sharedNote: draft.sharedText.trim() && draft.recipientIds.length ? { text: draft.sharedText, recipientIds: draft.recipientIds } : null,
      aiNote: draft.aiNote.trim() || null,
    }
    try {
      const result = session ? await api.updateMySession(session.id, payload) : await api.createSession({ ...payload, childId: child.id })
      onSaved(result)
      emitDataChanged("sessions")
      const shared = !session && result.session.sharedNote
      toast.success(session ? F.savedEdit : F.saved(label), {
        description: shared ? F.savedShared(result.session.sharedNote!.recipients.map((r) => nameOf(r.userId)).join(", ")) : undefined,
      })
      if (result.roadmapProposed) toast.info(F.roadmapProposed)
      onClose()
    } catch {
      toast.error(F.error)
    } finally {
      setSaving(false)
    }
  }

  const pendingAfter = ai ? ai.pending + (!session?.aiNote && !isBlank(draft.aiNote) ? 1 : 0) : 0
  const sharedEnabled = draft.recipientIds.length > 0

  return (
    <form onSubmit={submit} noValidate data-session-form className="flex h-full min-h-0 flex-col">
      <SheetHeader className="border-b border-line p-5 pe-14 sm:p-6 sm:pe-14">
        <SheetTitle className="text-xl font-semibold text-ink">
          {editing ? F.editTitle(label, formatDate(session.date, intlLocale)) : F.newTitle(S.space[role].new, child.identity.firstName)}
        </SheetTitle>
        <SheetDescription className="text-sm text-ink-muted">{F.notesHint}</SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-5 sm:p-6">
        {/* ───────── Champs propres au rôle */}
        <section aria-labelledby={`${ids}-session`} className="flex flex-col gap-4">
          <h3 id={`${ids}-session`} className="text-base font-semibold text-ink">
            {F.sessionSection}
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label={F.date} type="date" value={draft.date} onChange={(v) => set({ date: v })} error={errors.date} />
            {role === "psychologue" && (
              <>
                <TextField
                  label={F.duration}
                  type="number"
                  inputMode="numeric"
                  value={draft.durationMin}
                  onChange={(v) => set({ durationMin: v })}
                  error={errors.durationMin}
                />
                <SelectField<ConsultationType>
                  label={F.type}
                  value={draft.type}
                  onChange={(v) => set({ type: v })}
                  options={(["initiale", "suivi", "crise"] as ConsultationType[]).map((k) => ({ value: k, label: S.consultationTypes[k] }))}
                />
              </>
            )}
            {role === "social" && (
              <SelectField<VisitLocation>
                className="sm:col-span-2"
                label={F.location}
                value={draft.location}
                onChange={(v) => set({ location: v })}
                options={(["domicile", "centre", "autre"] as VisitLocation[]).map((k) => ({ value: k, label: S.visitLocations[k] }))}
              />
            )}
            {role === "educateur" && (
              <>
                <TextField label={F.activity} placeholder={F.activityPlaceholder} value={draft.context} onChange={(v) => set({ context: v })} error={errors.context} />
                <TextField
                  label={F.duration}
                  type="number"
                  inputMode="numeric"
                  value={draft.durationMin}
                  onChange={(v) => set({ durationMin: v })}
                  error={errors.durationMin}
                />
              </>
            )}
          </div>

          {role === "psychologue" && (
            <div className="grid gap-6 rounded-card border border-line p-4 sm:p-5 md:grid-cols-[1fr_auto]">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm font-semibold text-ink">{F.scales}</p>
                  <p className="text-sm text-ink-muted">{F.scalesHint}</p>
                </div>
                {MOOD_SCALE_KEYS.map((k) => (
                  <ScaleInput
                    key={k}
                    label={t.scales[k]}
                    ends={F.scaleEnds[k]}
                    value={draft.scales[k]}
                    moodColors={k === "humeur"}
                    valueText={(n) => F.scaleValue(t.scales[k], n)}
                    onChange={(v) => set({ scales: { ...draft.scales, [k]: v } })}
                  />
                ))}
              </div>
              {/* aperçu en direct du halo (zone pop : l'avatar) */}
              <div className="flex flex-col items-center gap-3 md:sticky md:top-0 md:self-start md:pt-2" aria-live="polite">
                <ChildAvatar
                  seed={child.identity.avatarSeed}
                  sex={child.identity.sex}
                  name={child.identity.firstName}
                  mood={draft.scales.humeur}
                  size="lg"
                  animated
                />
                <p className="max-w-36 text-center text-xs text-ink-muted">{F.scalesPreview}</p>
                <p className="text-sm font-medium text-ink">{t.moods[draft.scales.humeur]}</p>
              </div>
            </div>
          )}

          {role === "social" && (
            <>
              <TagsField label={F.peopleMet} values={draft.peopleMet} onChange={(v) => set({ peopleMet: v })} />
              <TextareaField
                label={F.livingConditions}
                hint={F.livingConditionsHint}
                value={draft.livingConditions}
                onChange={(v) => set({ livingConditions: v })}
              />
            </>
          )}

          {role === "educateur" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-ink">{F.skillsObserved}</legend>
              <p className="text-xs text-ink-muted">{F.skillsObservedHint}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {skillChoices.map((sk) => {
                  const on = draft.skillsObserved.includes(sk)
                  return (
                    <button
                      key={sk}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set({ skillsObserved: on ? draft.skillsObserved.filter((x) => x !== sk) : [...draft.skillsObserved, sk] })
                      }
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                        on ? "border-teal bg-teal text-white" : "border-line bg-surface text-ink hover:border-ink-muted",
                      )}
                    >
                      {on && <Check className="size-4" aria-hidden />}
                      {sk}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}
        </section>

        {/* ───────── Les 3 sorties */}
        <section aria-labelledby={`${ids}-notes`} className="flex flex-col gap-4">
          <div>
            <h3 id={`${ids}-notes`} className="text-base font-semibold text-ink">
              {F.notesSection}
            </h3>
            <p className="text-sm text-ink-muted">{F.notesHint}</p>
          </div>

          {errors.zones && (
            <p data-zone-error tabIndex={-1} role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive outline-none">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {errors.zones}
            </p>
          )}

          {/* 1. Privé */}
          <NoteZone tone="private" headingId={`${ids}-z1`} title={F.zonePrivate.title} hint={F.zonePrivate.hint}>
            <Textarea
              aria-labelledby={`${ids}-z1`}
              rows={3}
              placeholder={F.zonePrivate.placeholder}
              value={draft.privateNote}
              onChange={(e) => set({ privateNote: e.target.value })}
              aria-invalid={errors.privateNote ? true : undefined}
              aria-describedby={errors.privateNote ? `${ids}-z1-err` : undefined}
            />
            {errors.privateNote && (
              <p id={`${ids}-z1-err`} className="text-sm font-medium text-destructive">
                {errors.privateNote}
              </p>
            )}
          </NoteZone>

          {/* 2. À partager */}
          <NoteZone
            tone="shared"
            headingId={`${ids}-z2`}
            title={F.zoneShared.title}
            hint={sharedEnabled ? F.zoneShared.placeholder : F.zoneShared.hint}
            footer={
              draft.recipientIds.length ? F.zoneShared.readBy(draft.recipientIds.map(nameOf).join(", ")) : F.zoneShared.nobody
            }
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{F.zoneShared.recipients}</legend>
              {colleagues.map((m) => {
                const checked = draft.recipientIds.includes(m.id)
                const locked = delivered.has(m.id)
                const cbId = `${ids}-r-${m.id}`
                return (
                  <div key={m.id} className="flex min-h-11 items-center gap-3 rounded-lg bg-surface/70 px-3">
                    <Checkbox
                      id={cbId}
                      checked={checked}
                      disabled={locked}
                      aria-labelledby={`${cbId}-label`}
                      onCheckedChange={(v) =>
                        set({ recipientIds: v ? [...draft.recipientIds, m.id] : draft.recipientIds.filter((x) => x !== m.id) })
                      }
                    />
                    <label id={`${cbId}-label`} htmlFor={cbId} className="flex flex-1 flex-wrap items-center gap-2 py-2 text-sm font-medium text-ink">
                      {m.firstName} {m.lastName}
                      <RoleBadge role={m.role} />
                      {locked && <span className="text-xs font-normal text-ink-muted">· {F.zoneShared.locked}</span>}
                    </label>
                  </div>
                )
              })}
            </fieldset>
            <Textarea
              aria-labelledby={`${ids}-z2`}
              rows={3}
              disabled={!sharedEnabled}
              placeholder={sharedEnabled ? F.zoneShared.placeholder : F.zoneShared.hint}
              value={draft.sharedText}
              onChange={(e) => set({ sharedText: e.target.value })}
              aria-invalid={errors.sharedText ? true : undefined}
              aria-describedby={errors.sharedText ? `${ids}-z2-err` : undefined}
            />
            {errors.sharedText && (
              <p id={`${ids}-z2-err`} className="text-sm font-medium text-destructive">
                {errors.sharedText}
              </p>
            )}
          </NoteZone>

          {/* 3. Pour l'IA */}
          <NoteZone
            tone="ai"
            headingId={`${ids}-z3`}
            title={F.zoneAi.title}
            hint={F.zoneAi.hint}
            footer={
              ai && (
                <span className="flex flex-col gap-1">
                  <span className="font-medium tabular-nums">{F.zoneAi.counter(Math.min(pendingAfter, ai.threshold), ai.threshold)}</span>
                  <span aria-hidden className="flex gap-1">
                    {Array.from({ length: ai.threshold }, (_, i) => (
                      <span key={i} className={cn("h-1.5 w-8 rounded-full", i < pendingAfter ? "bg-zone-ai" : "bg-zone-ai/20")} />
                    ))}
                  </span>
                  {pendingAfter >= ai.threshold && <span>{F.zoneAi.willTrigger}</span>}
                </span>
              )
            }
          >
            <Textarea
              aria-labelledby={`${ids}-z3`}
              rows={3}
              readOnly={aiFrozen}
              placeholder={F.zoneAi.placeholder}
              value={draft.aiNote}
              onChange={(e) => set({ aiNote: e.target.value })}
              aria-invalid={errors.aiNote ? true : undefined}
              aria-describedby={errors.aiNote ? `${ids}-z3-err` : aiFrozen ? `${ids}-z3-frozen` : undefined}
            />
            {aiFrozen && (
              <p id={`${ids}-z3-frozen`} className="text-sm text-zone-ai-ink">
                {F.zoneAi.frozen}
              </p>
            )}
            {errors.aiNote && (
              <p id={`${ids}-z3-err`} className="text-sm font-medium text-destructive">
                {errors.aiNote}
              </p>
            )}
          </NoteZone>
        </section>
      </div>

      <div className="flex flex-row justify-end gap-2 border-t border-line p-4 sm:p-5">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={saving} aria-describedby={invalid ? `${ids}-invalid` : undefined}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {saving ? F.saving : editing ? F.submitEdit : F.submit}
        </Button>
        {invalid && (
          <span id={`${ids}-invalid`} className="sr-only">
            {t.pages.child.cards.fixErrors}
          </span>
        )}
      </div>
    </form>
  )
}
