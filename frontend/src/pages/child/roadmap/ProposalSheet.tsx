import { useId, useState } from "react"
import { Check, Loader2, MessageSquare, Minus, Pencil, Plus, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { useCurrentUser } from "@/auth/context"
import { RoleBadge } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n/context"
import { canRequestRoadmapUpdate, canValidateRoadmapPart, ROADMAP_OWNERS } from "@/lib/access"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Roadmap, RoadmapContentMap, RoadmapPartKey, RoadmapSource } from "@/types"
import type { TeamMember } from "../ChildHero"
import { applyChoices, diffPart, type FieldDiff } from "./diff"

type Mode = "view" | "modify" | "reject"

/**
 * Proposition de l'IA pour une partie : avant / après (ajouts en vert, retraits barrés), sources,
 * actions du responsable (Valider / Modifier / Rejeter) ou commentaires pour les autres.
 */
export function ProposalSheet({
  part,
  roadmap,
  sources,
  team,
  onOpenChange,
  onDone,
}: {
  part: RoadmapPartKey | null
  roadmap: Roadmap
  sources: RoadmapSource[]
  team: TeamMember[]
  onOpenChange: (open: boolean) => void
  onDone: (roadmap: Roadmap, validated: RoadmapPartKey | null) => void
}) {
  const { dir } = useI18n()
  const open = part !== null && !!roadmap.parts[part].pending
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={dir === "rtl" ? "left" : "right"} className="w-full gap-0 bg-surface p-0 data-[side=left]:sm:max-w-3xl data-[side=right]:sm:max-w-3xl">
        {open && part && <ProposalBody key={roadmap.parts[part].pending!.id} part={part} roadmap={roadmap} sources={sources} team={team} onDone={onDone} onClose={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function ProposalBody({
  part,
  roadmap,
  sources,
  team,
  onDone,
  onClose,
}: {
  part: RoadmapPartKey
  roadmap: Roadmap
  sources: RoadmapSource[]
  team: TeamMember[]
  onDone: (roadmap: Roadmap, validated: RoadmapPartKey | null) => void
  onClose: () => void
}) {
  const { t, intlLocale } = useI18n()
  const R = t.roadmap
  const P = R.proposal
  const user = useCurrentUser()
  const ids = useId()
  const fmt = (d: string) => formatDate(d, intlLocale)
  const p = roadmap.parts[part]
  const pending = p.pending!
  const before = p.validated.content as RoadmapContentMap[typeof part]
  const after = pending.content as RoadmapContentMap[typeof part]
  const diffs = diffPart(part, before, after, fmt).filter((d) => d.changed)
  const owner = ROADMAP_OWNERS[part]
  const isOwner = canValidateRoadmapPart(user.role, part)
  const canComment = !isOwner && canRequestRoadmapUpdate(user.role)

  const [mode, setMode] = useState<Mode>("view")
  const [declined, setDeclined] = useState<Set<string>>(new Set())
  const [justification, setJustification] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState("")
  const [openSource, setOpenSource] = useState<string | null>(null)

  const sourcesOf = (field: string) => [
    ...new Set(pending.changes.filter((c) => c.field === field).flatMap((c) => c.sourceSessionIds)),
  ]
  const name = (id: string) => {
    const m = team.find((x) => x.id === id)
    return m ? `${m.firstName} ${m.lastName}` : ""
  }

  const run = async (action: () => Promise<Roadmap>, message: string, validated: boolean) => {
    setBusy(true)
    try {
      const r = await action()
      toast.success(message)
      onDone(r, validated ? part : null)
      onClose()
    } catch {
      toast.error(P.error)
    } finally {
      setBusy(false)
    }
  }

  const validate = () => run(() => api.validateRoadmapPart(roadmap.childId, part), P.validated(R.parts[part]), true)
  const confirm = () => {
    setSubmitted(true)
    if (!justification.trim()) return
    if (mode === "reject") {
      void run(() => api.rejectRoadmapPart(roadmap.childId, part, justification), P.rejected(R.parts[part]), false)
    } else {
      const modifiedContent = applyChoices(part, before, after, declined, fmt)
      void run(() => api.validateRoadmapPart(roadmap.childId, part, { modifiedContent, justification }), P.modified(R.parts[part]), true)
    }
  }
  const sendComment = async () => {
    if (!comment.trim()) return
    setBusy(true)
    try {
      const r = await api.commentRoadmapProposal(roadmap.childId, part, comment)
      setComment("")
      toast.success(P.commentSent)
      onDone(r, null)
    } catch {
      toast.error(P.error)
    } finally {
      setBusy(false)
    }
  }

  const sourceButton = (sid: string) => {
    const s = sources.find((x) => x.sessionId === sid)
    if (!s) return null
    const open = openSource === sid
    return (
      <span key={sid} className="inline-flex flex-col">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpenSource(open ? null : sid)}
          className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-teal underline-offset-2 hover:underline"
        >
          {P.sourceNote(P.ofRole[s.authorRole], fmt(s.date))}
        </button>
        {open && (
          <span className="mt-1 rounded-lg bg-zone-ai-soft p-2 text-xs text-ink">
            {s.text ? (
              <>
                <span className="font-semibold text-zone-ai-ink">{P.sourceYours}</span> {s.text}
              </>
            ) : (
              <>
                {s.authorName} · {t.sessions.kinds[s.sessionKind]} · {P.sourceHidden}
              </>
            )}
          </span>
        )}
      </span>
    )
  }

  const fieldBlock = (d: FieldDiff) => {
    const srcs = sourcesOf(d.field)
    return (
      <section key={d.field} className="rounded-xl border border-line p-4">
        <h4 className="text-sm font-semibold text-ink">{R.fields[d.field] ?? d.field}</h4>
        <ul className="mt-2 flex flex-col gap-1.5">
          {d.items.map((it) => {
            const change = it.status !== "kept"
            const kept = !declined.has(it.key)
            return (
              <li
                key={it.key}
                className={cn(
                  "flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm",
                  it.status === "added" && "bg-phase-5-soft text-phase-5-ink",
                  it.status === "removed" && "bg-destructive/5 text-ink-muted",
                  mode === "modify" && change && !kept && "opacity-50",
                )}
              >
                {it.status === "added" && <Plus className="mt-0.5 size-4 shrink-0" aria-hidden />}
                {it.status === "removed" && <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />}
                {it.status === "kept" && <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-muted/50" />}
                <span className={cn("flex-1", it.status === "removed" && "line-through")}>
                  {change && <span className="sr-only">{it.status === "added" ? P.added : P.removed} : </span>}
                  {it.text}
                </span>
                {mode === "modify" && change && (
                  <Checkbox
                    checked={kept}
                    aria-label={`${P.keep} : ${it.text}`}
                    onCheckedChange={(v) =>
                      setDeclined((s) => {
                        const n = new Set(s)
                        if (v) n.delete(it.key)
                        else n.add(it.key)
                        return n
                      })
                    }
                  />
                )}
              </li>
            )
          })}
        </ul>
        {srcs.length > 0 && (
          <p className="mt-2 flex flex-wrap items-start gap-x-2 gap-y-1 text-xs text-ink-muted">
            <Sparkles className="size-3.5 text-zone-ai" aria-hidden />
            {P.basedOn} {srcs.map(sourceButton)}
          </p>
        )}
      </section>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="border-b border-line p-5 pe-14 sm:p-6 sm:pe-14">
        <SheetTitle className="flex items-center gap-2 text-xl font-semibold text-ink">
          <Sparkles className="size-5 text-zone-ai" aria-hidden />
          {P.title(R.parts[part])}
        </SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          {P.createdOn(fmt(pending.createdAt), P.triggers[pending.trigger])}
          <RoleBadge role={owner} />
        </SheetDescription>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-phase-5-soft ring-1 ring-phase-5" /> {P.added}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded bg-destructive/10 ring-1 ring-destructive/40" /> <span className="line-through">{P.removed}</span>
          </span>
        </div>
        {mode === "modify" && <p className="rounded-lg bg-muted p-3 text-sm text-ink">{P.modifyHint}</p>}
        {diffs.length ? diffs.map(fieldBlock) : <p className="text-sm text-ink-muted">{P.noChanges}</p>}

        {/* commentaires */}
        <section aria-labelledby={`${ids}-comments`} className="flex flex-col gap-2">
          <h4 id={`${ids}-comments`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <MessageSquare className="size-4" aria-hidden />
            {P.comments}
          </h4>
          {pending.comments.length ? (
            <ul className="flex flex-col gap-2">
              {pending.comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-sand p-3 text-sm">
                  <span className="font-medium text-ink">{name(c.authorId)}</span>
                  <span className="text-ink-muted"> · {fmt(c.createdAt)}</span>
                  <p className="mt-1 text-ink">{c.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{P.noComments}</p>
          )}
          {canComment && (
            <div className="flex flex-col gap-2">
              <label htmlFor={`${ids}-comment`} className="text-sm font-medium text-ink">
                {P.commentLabel}
              </label>
              <Textarea id={`${ids}-comment`} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} aria-describedby={`${ids}-comment-hint`} />
              <p id={`${ids}-comment-hint`} className="text-xs text-ink-muted">
                {P.commentHint}
              </p>
              <Button variant="outline" className="w-fit" disabled={busy || !comment.trim()} onClick={sendComment}>
                {P.commentSend}
              </Button>
            </div>
          )}
        </section>

        {(mode === "modify" || mode === "reject") && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${ids}-just`} className="text-sm font-medium text-ink">
              {P.justification} *
            </label>
            <Textarea
              id={`${ids}-just`}
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              aria-invalid={submitted && !justification.trim() ? true : undefined}
              aria-describedby={submitted && !justification.trim() ? `${ids}-just-err` : undefined}
              autoFocus
            />
            {submitted && !justification.trim() && (
              <p id={`${ids}-just-err`} className="text-sm font-medium text-destructive">
                {P.justificationRequired}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line p-4 sm:p-5">
        {!isOwner ? (
          <p className="me-auto text-sm text-ink-muted">{P.onlyOwner(R.theRole[owner])}</p>
        ) : mode === "view" ? (
          <>
            <Button variant="ghost" className="text-destructive" onClick={() => setMode("reject")} disabled={busy}>
              <X data-icon="inline-start" aria-hidden />
              {P.reject}
            </Button>
            <Button variant="outline" onClick={() => setMode("modify")} disabled={busy}>
              <Pencil data-icon="inline-start" aria-hidden />
              {P.modify}
            </Button>
            <Button onClick={validate} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check data-icon="inline-start" aria-hidden />}
              {P.validate}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setMode("view")
                setSubmitted(false)
                setDeclined(new Set())
              }}
            >
              {P.cancel}
            </Button>
            <Button variant={mode === "reject" ? "destructive" : "default"} onClick={confirm} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {mode === "reject" ? P.confirmReject : P.confirmModify}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
