import { useLayoutEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROLE_BORDER } from "@/lib/tokens"
import { useI18n } from "@/i18n/context"
import type { ISODateTime, Role } from "@/types"
import { RoleBadge } from "./RoleBadge"
import { UserAvatar } from "./UserAvatar"

/**
 * Note partagée reçue : avatar + nom + rôle de l'auteur, « partagée le 12/11 à 14 h », séance d'origine, texte.
 * - texte replié au-delà de 4 lignes (« Lire la suite ») ;
 * - non lue : liseré de la couleur du rôle de l'auteur + pastille « Nouveau » ; toute la carte s'ouvre au clic ;
 * - ouvrir ou déplier appelle `onOpen` (marque la note comme lue pour ce lecteur).
 * `expanded` / `onExpandedChange` permettent de garder l'état déplié quand la carte change de liste.
 */
export function NoteCard({
  authorName,
  authorRole,
  authorAvatarSeed,
  sharedAt,
  sessionLabel,
  text,
  unread = false,
  onOpen,
  expanded: expandedProp,
  onExpandedChange,
  className,
}: {
  authorName: string
  authorRole: Role
  authorAvatarSeed?: string
  sharedAt: ISODateTime
  sessionLabel: string
  text: string
  unread?: boolean
  onOpen?: () => void
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  className?: string
}) {
  const { t, intlLocale } = useI18n()
  const [expandedState, setExpandedState] = useState(false)
  const expanded = expandedProp ?? expandedState
  const setExpanded = (v: boolean) => {
    setExpandedState(v)
    onExpandedChange?.(v)
  }
  const textRef = useRef<HTMLParagraphElement>(null)
  const [overflows, setOverflows] = useState(false)

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || expanded) return
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, expanded])

  const d = new Date(sharedAt)
  const date = new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit" }).format(d)
  const hour = `${d.getHours()} h${d.getMinutes() ? ` ${String(d.getMinutes()).padStart(2, "0")}` : ""}` // « 14 h », « 20 h 47 »

  const open = () => {
    if (!expanded && overflows) setExpanded(true)
    onOpen?.()
  }

  return (
    <article
      className={cn(
        "relative rounded-card border border-line bg-surface p-5 shadow-card",
        unread && cn("border-s-4", ROLE_BORDER[authorRole]),
        unread && onOpen && "transition-shadow hover:shadow-raised",
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {authorAvatarSeed && <UserAvatar seed={authorAvatarSeed} name="" size="sm" />}
        <span className="font-semibold text-ink">{authorName}</span>
        <RoleBadge role={authorRole} />
        {unread && (
          <span className="ms-auto inline-flex h-6 items-center rounded-full bg-teal px-2 text-xs font-semibold text-white">
            {t.common.new}
          </span>
        )}
      </header>

      <p className="mt-1 text-sm text-ink-muted">
        {t.notes.sharedAt(date, hour)} · {sessionLabel}
      </p>

      <p
        ref={textRef}
        className={cn("mt-3 text-base leading-relaxed whitespace-pre-line text-ink", !expanded && "line-clamp-4", unread && "font-medium")}
      >
        {text}
      </p>

      {/* toute la carte non lue est cliquable (bouton étiré, sous le bouton « Lire la suite ») */}
      {unread && onOpen && (
        <button type="button" onClick={open} className="absolute inset-0 rounded-card" aria-label={t.notes.openNote(authorName)} />
      )}

      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => (expanded ? setExpanded(false) : open())}
          aria-expanded={expanded}
          className="relative z-10 mt-2 inline-flex items-center gap-1 rounded-md text-sm font-medium text-teal hover:underline"
        >
          {expanded ? t.notes.readLess : t.notes.readMore}
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
      )}
    </article>
  )
}
