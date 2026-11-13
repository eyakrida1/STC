import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { NotebookPen, Plus, TriangleAlert } from "lucide-react"
import * as api from "@/api"
import { useCurrentUser } from "@/auth/context"
import { EmptyState } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useI18n } from "@/i18n/context"
import { ROLE_DOT } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import type { Child, ProfessionalRole, Session, SessionResult } from "@/types"
import type { TeamMember } from "../ChildHero"
import { ZoneIcon } from "./NoteZone"
import { SessionDetailSheet } from "./SessionDetailSheet"
import { SessionSheet } from "./SessionSheet"
import { sessionFirstLine, sessionMeta } from "./sessionText"

/** Onglet « Mon espace » : historique de MES séances sur cet enfant + nouvelle séance. */
export function SpaceTab({
  child,
  team,
  onChildChange,
}: {
  child: Child
  team: TeamMember[]
  onChildChange: (c: Child) => void
}) {
  const { t, intlLocale } = useI18n()
  const S = t.sessions
  const user = useCurrentUser()
  const role = user.role as ProfessionalRole
  const labels = S.space[role]

  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [detail, setDetail] = useState<Session | null>(null)
  const [form, setForm] = useState<{ open: boolean; session: Session | null }>({ open: false, session: null })
  const [highlight, setHighlight] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .listMySessions(child.id)
      .then((list) => {
        setSessions(list)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [child.id])

  useEffect(() => {
    load()
  }, [load])

  const onSaved = ({ session, child: updated }: SessionResult) => {
    setSessions((list) => {
      const rest = (list ?? []).filter((s) => s.id !== session.id)
      return [session, ...rest].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    })
    setHighlight(session.id)
    onChildChange(updated) // l'humeur a pu changer : l'avatar de l'en-tête s'anime
  }

  const name = (id: string) => {
    const m = team.find((x) => x.id === id)
    return m ? `${m.firstName} ${m.lastName}` : id
  }

  const day = (iso: string) => new Intl.DateTimeFormat(intlLocale, { day: "numeric" }).format(new Date(`${iso}T12:00:00`))
  const month = (iso: string) => new Intl.DateTimeFormat(intlLocale, { month: "short", year: "numeric" }).format(new Date(`${iso}T12:00:00`))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-ink">{labels.title}</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">{S.spaceDescription}</p>
        </div>
        <Button size="lg" onClick={() => setForm({ open: true, session: null })}>
          <Plus data-icon="inline-start" aria-hidden />
          {labels.new}
        </Button>
      </div>

      {failed ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={TriangleAlert}
            title={t.pages.child.loadError}
            action={
              <Button variant="outline" onClick={load}>
                {t.pages.children.retry}
              </Button>
            }
          />
        </div>
      ) : sessions === null ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card border border-line bg-surface" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={NotebookPen}
            title={labels.empty}
            description={S.emptyText}
            action={
              <Button onClick={() => setForm({ open: true, session: null })}>
                <Plus data-icon="inline-start" aria-hidden />
                {labels.new}
              </Button>
            }
          />
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {sessions.map((s) => {
              const first = sessionFirstLine(s)
              const title = `${labels.one} · ${sessionMeta(s, t)}`
              return (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    type="button"
                    onClick={() => setDetail(s)}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-card border bg-surface p-4 text-start shadow-card transition hover:-translate-y-0.5 hover:shadow-raised sm:p-5",
                      highlight === s.id ? "border-teal ring-2 ring-teal/20" : "border-line",
                    )}
                  >
                    <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-sand py-2 text-center">
                      <span className="text-2xl leading-none font-semibold text-ink tabular-nums">{day(s.date)}</span>
                      <span className="mt-1 text-xs text-ink-muted">{month(s.date)}</span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-semibold text-ink">{title}</span>
                      <span className={cn("truncate text-sm", first ? "text-ink" : "text-ink-muted italic")}>{first ?? S.noText}</span>
                    </span>
                    {/* ce qui a été partagé, avec qui, et envoyé à l'IA */}
                    <span className="flex shrink-0 items-center gap-1.5" aria-hidden={false}>
                      {s.privateNote && (
                        <Tooltip>
                          <TooltipTrigger render={<span />} className="inline-flex">
                            <ZoneIcon tone="private" />
                            <span className="sr-only">{S.privateOnly}</span>
                          </TooltipTrigger>
                          <TooltipContent>{S.privateOnly}</TooltipContent>
                        </Tooltip>
                      )}
                      {s.sharedNote && (
                        <Tooltip>
                          <TooltipTrigger render={<span />} className="inline-flex items-center gap-1">
                            <ZoneIcon tone="shared" />
                            <span className="flex -space-x-1">
                              {s.sharedNote.recipients.map((r) => {
                                const m = team.find((x) => x.id === r.userId)
                                return m ? (
                                  <span key={r.userId} className={cn("size-2.5 rounded-full ring-2 ring-surface", ROLE_DOT[m.role])} />
                                ) : null
                              })}
                            </span>
                            <span className="sr-only">{S.sharedWith(s.sharedNote.recipients.map((r) => name(r.userId)).join(", "))}</span>
                          </TooltipTrigger>
                          <TooltipContent>{S.sharedWith(s.sharedNote.recipients.map((r) => name(r.userId)).join(", "))}</TooltipContent>
                        </Tooltip>
                      )}
                      {s.aiNote && (
                        <Tooltip>
                          <TooltipTrigger render={<span />} className="inline-flex">
                            <ZoneIcon tone="ai" />
                            <span className="sr-only">{S.sentToAi}</span>
                          </TooltipTrigger>
                          <TooltipContent>{S.sentToAi}</TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      )}

      <SessionDetailSheet
        session={detail}
        team={team}
        onOpenChange={(o) => !o && setDetail(null)}
        onEdit={(s) => {
          setDetail(null)
          setForm({ open: true, session: s })
        }}
      />
      <SessionSheet
        open={form.open}
        onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        child={child}
        team={team}
        session={form.session}
        onSaved={onSaved}
      />
    </div>
  )
}
