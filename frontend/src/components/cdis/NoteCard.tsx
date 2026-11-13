import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import { ROLE_BORDER } from "@/lib/tokens"
import { useI18n } from "@/i18n/context"
import type { ISODateTime, Role } from "@/types"
import { RoleBadge } from "./RoleBadge"

/**
 * Note partagée reçue : auteur + rôle, date de partage, séance d'origine, texte.
 * Non lue : liseré au début, pastille « Nouveau » ; cliquer (ou Entrée) l'ouvre et la marque comme lue.
 */
export function NoteCard({
  authorName,
  authorRole,
  sharedAt,
  sessionLabel,
  text,
  unread = false,
  onOpen,
  className,
}: {
  authorName: string
  authorRole: Role
  sharedAt: ISODateTime
  sessionLabel: string
  text: string
  unread?: boolean
  onOpen?: () => void
  className?: string
}) {
  const { t, intlLocale } = useI18n()
  const interactive = unread && !!onOpen

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-semibold text-ink">{authorName}</span>
        <RoleBadge role={authorRole} />
        {unread && (
          <span className="ms-auto inline-flex h-6 items-center rounded-full bg-teal px-2 text-xs font-semibold text-white">
            {t.common.new}
          </span>
        )}
      </div>
      <p className={cn("mt-3 text-base leading-relaxed text-ink", unread && "font-medium")}>{text}</p>
      <p className="mt-3 text-sm text-ink-muted">
        {t.notes.sharedOn(formatDate(sharedAt, intlLocale))} · {sessionLabel}
      </p>
    </>
  )

  const classes = cn(
    "block w-full rounded-card border border-line bg-surface p-5 text-start shadow-card",
    unread && cn("border-s-4", ROLE_BORDER[authorRole]),
    interactive && "cursor-pointer transition-shadow hover:shadow-raised",
    className,
  )

  return interactive ? (
    <button type="button" onClick={onOpen} className={classes}>
      {body}
    </button>
  ) : (
    <article className={classes}>{body}</article>
  )
}
