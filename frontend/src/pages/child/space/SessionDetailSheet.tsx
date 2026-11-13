import { Clock, Pencil } from "lucide-react"
import { useCurrentUser } from "@/auth/context"
import { MoodBadge, RoleBadge } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/i18n/context"
import { canEditSession, sessionEditRemainingMs } from "@/lib/access"
import { formatDate, formatDateLong } from "@/lib/format"
import { MOOD_SCALE_KEYS, type ProfessionalRole, type Session } from "@/types"
import type { TeamMember } from "../ChildHero"
import { InfoList, Tags } from "../dossier/InfoList"
import { NoteZone } from "./NoteZone"
import { sessionMeta } from "./sessionText"

/** Détail complet d'une séance (auteur seul) + « Modifier » pendant 24 h. */
export function SessionDetailSheet({
  session,
  team,
  onOpenChange,
  onEdit,
}: {
  session: Session | null
  team: TeamMember[]
  onOpenChange: (open: boolean) => void
  onEdit: (s: Session) => void
}) {
  const { t, intlLocale, dir } = useI18n()
  const S = t.sessions
  const F = S.form
  const user = useCurrentUser()
  const role = user.role as ProfessionalRole

  const member = (id: string) => team.find((m) => m.id === id)

  return (
    <Sheet open={session !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side={dir === "rtl" ? "left" : "right"}
        className="w-full gap-0 bg-surface p-0 data-[side=left]:sm:max-w-2xl data-[side=right]:sm:max-w-2xl"
      >
        {session && (
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="border-b border-line p-5 pe-14 sm:p-6 sm:pe-14">
              <SheetTitle className="text-xl font-semibold text-ink">
                {S.detailTitle(S.space[role].one, formatDateLong(session.date, intlLocale))}
              </SheetTitle>
              <SheetDescription className="text-sm text-ink-muted">
                {sessionMeta(session, t)}
                {session.updatedAt && ` · ${S.editedOn(formatDate(session.updatedAt, intlLocale))}`}
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-6">
              {/* champs propres au rôle */}
              {session.details.kind === "consultation" && (
                <div className="flex flex-col gap-4">
                  <InfoList
                    items={[
                      { label: F.type, value: S.consultationTypes[session.details.type] },
                      { label: F.duration, value: S.minutes(session.details.durationMin) },
                    ]}
                  />
                  <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
                    <p className="text-sm font-semibold text-ink">{F.scales}</p>
                    <MoodBadge level={session.details.scales.humeur} withPrefix size="md" className="w-fit" />
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {MOOD_SCALE_KEYS.filter((k) => k !== "humeur").map((k) => {
                        const v = (session.details as { scales: Record<string, number> }).scales[k]
                        return (
                          <li key={k} className="flex items-center gap-3">
                            <span className="w-40 shrink-0 text-sm text-ink-muted">{t.scales[k]}</span>
                            <span className="relative h-2 flex-1 rounded-full bg-muted">
                              <span className="absolute inset-y-0 start-0 rounded-full bg-teal" style={{ width: `${(v / 5) * 100}%` }} />
                            </span>
                            <span className="w-8 text-end text-sm font-semibold text-ink tabular-nums">{v}/5</span>
                          </li>
                        )
                      })}
                    </ul>
                    <p className="text-xs text-ink-muted">{F.scalesHint}</p>
                  </div>
                </div>
              )}
              {session.details.kind === "visite" && (
                <InfoList
                  items={[
                    { label: F.location, value: S.visitLocations[session.details.location] },
                    { label: F.peopleMet, value: <Tags values={session.details.peopleMet} empty={t.common.none} />, wide: true },
                    { label: F.livingConditions, value: session.details.livingConditions || "—", wide: true },
                  ]}
                />
              )}
              {session.details.kind === "observation" && (
                <InfoList
                  items={[
                    { label: F.activity, value: session.details.context },
                    { label: F.duration, value: session.details.durationMin ? S.minutes(session.details.durationMin) : "—" },
                    { label: F.skillsObserved, value: <Tags values={session.details.skillsObserved} empty={t.common.none} />, wide: true },
                  ]}
                />
              )}

              {/* les 3 sorties */}
              {session.privateNote && (
                <NoteZone tone="private" title={F.zonePrivate.title} hint={F.zonePrivate.hint}>
                  <p className="text-base whitespace-pre-line text-ink">{session.privateNote}</p>
                </NoteZone>
              )}
              {session.sharedNote && (
                <NoteZone tone="shared" title={F.zoneShared.title} hint={formatDate(session.sharedNote.sharedAt, intlLocale)}>
                  <p className="text-base whitespace-pre-line text-ink">{session.sharedNote.text}</p>
                  <div>
                    <p className="text-sm font-medium text-zone-shared-ink">{S.readBy}</p>
                    <ul className="mt-1 flex flex-col gap-1.5">
                      {session.sharedNote.recipients.map((r) => {
                        const m = member(r.userId)
                        return (
                          <li key={r.userId} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                            {m ? `${m.firstName} ${m.lastName}` : r.userId}
                            {m && <RoleBadge role={m.role} />}
                            <span className="text-ink-muted">
                              · {r.readAt ? S.readOn(formatDate(r.readAt, intlLocale)) : S.notReadYet}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </NoteZone>
              )}
              {session.aiNote && (
                <NoteZone
                  tone="ai"
                  title={F.zoneAi.title}
                  hint={session.aiNote.consumedByProposalId ? S.aiUsed : S.aiPending}
                >
                  <p className="text-base whitespace-pre-line text-ink">{session.aiNote.text}</p>
                </NoteZone>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 sm:p-5">
              {canEditSession(session) ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                    <Clock className="size-4" aria-hidden />
                    {S.editRemaining(Math.ceil(sessionEditRemainingMs(session) / 3_600_000))}
                  </span>
                  <Button onClick={() => onEdit(session)}>
                    <Pencil data-icon="inline-start" aria-hidden />
                    {S.edit}
                  </Button>
                </>
              ) : (
                <span className="text-sm text-ink-muted">{S.editClosed}</span>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
