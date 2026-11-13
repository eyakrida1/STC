import { Link } from "react-router"
import { CalendarX2, Mail, RotateCcw, Route } from "lucide-react"
import { ChildAvatar, PhaseBadge } from "@/components/cdis"
import { useI18n } from "@/i18n/context"
import { formatRelative } from "@/lib/format"
import type { ChildSummary } from "@/types"

const pill = "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap"

/** Carte d'un enfant dans « Mes enfants ». Toute la carte est un lien vers le dossier. */
export function ChildCard({ child }: { child: ChildSummary }) {
  const { t, intlLocale } = useI18n()
  const p = t.pages.children
  const name = `${child.firstName} ${child.lastName}`

  const alerts = [
    child.unreadNotes > 0 && (
      <li key="notes" className="flex items-center gap-2">
        <Mail className="size-4 shrink-0 text-ink-muted" aria-hidden />
        {/* pastille corail : exception « pop » documentée dans CLAUDE.md ; texte encre pour le contraste AA */}
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-pop-coral px-1.5 text-xs font-semibold text-ink tabular-nums">
          {child.unreadNotes}
        </span>
        <span>{p.newNotesLabel(child.unreadNotes)}</span>
      </li>
    ),
    child.pendingValidation && (
      <li key="roadmap" className="flex items-center gap-2">
        <Route className="size-4 shrink-0 text-teal" aria-hidden />
        <span>{p.pendingValidation}</span>
      </li>
    ),
    child.recentAbsences > 0 && (
      <li key="absences" className="flex items-center gap-2">
        <CalendarX2 className="size-4 shrink-0 text-mood-2" aria-hidden />
        <span>{p.absences(child.recentAbsences)}</span>
      </li>
    ),
  ].filter(Boolean)

  return (
    <Link
      to={`/enfants/${child.id}`}
      className="group flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-center gap-4">
        <ChildAvatar seed={child.avatarSeed} name={child.firstName} sex={child.sex} mood={child.mood} size="md" animated={false} />
        <div className="min-w-0">
          <h2 className="text-lg leading-snug font-semibold break-words text-ink group-hover:text-teal">{name}</h2>
          <p className="text-sm text-ink-muted">
            {p.age(child.age)}
            <span aria-hidden> · </span>
            <span className="sr-only">, </span>
            {t.moods[child.mood]}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PhaseBadge phase={child.phase} />
        <span className={`${pill} bg-muted text-ink`}>{t.childStatus[child.status]}</span>
        {child.returned && (
          <span className={`${pill} bg-muted text-ink`}>
            <RotateCcw className="size-3.5" aria-hidden />
            {t.returned}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        {child.lastActivityAt ? p.lastActivity(formatRelative(child.lastActivityAt, intlLocale)) : p.noActivity}
      </p>

      {alerts.length > 0 && (
        <div className="mt-auto pt-4">
          <ul aria-label={p.alerts} className="flex flex-col gap-2 border-t border-line pt-3 text-sm font-medium text-ink">
            {alerts}
          </ul>
        </div>
      )}
    </Link>
  )
}

export function ChildCardSkeleton() {
  return (
    <div aria-hidden className="flex h-full flex-col rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div className="size-16 animate-pulse rounded-full bg-muted" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-5 w-3/4 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-3 h-3 w-1/2 animate-pulse rounded-md bg-muted" />
    </div>
  )
}
