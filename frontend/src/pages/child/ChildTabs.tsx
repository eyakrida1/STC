import { Link } from "react-router"
import { FileText, Inbox, NotebookPen, Route } from "lucide-react"
import { useCurrentUser } from "@/auth/context"
import { useT } from "@/i18n/context"
import { isProfessional } from "@/lib/access"
import { cn } from "@/lib/utils"
import type { Role } from "@/types"
import type { ChildTab } from "./tabs"

/** Navigation par onglets — de vrais liens (l'onglet actif est dans l'URL), aria-current sur l'actif. */
export function ChildTabs({ childId, active, unreadNotes }: { childId: string; active: ChildTab; unreadNotes: number }) {
  const t = useT()
  const p = t.pages.child.tabs
  const user = useCurrentUser()
  const pro = isProfessional(user.role)

  const items: { key: ChildTab; label: string; icon: typeof FileText; badge?: number }[] = [
    { key: "dossier", label: p.dossier, icon: FileText },
    ...(pro
      ? [
          { key: "espace" as const, label: p.space[user.role as Exclude<Role, "directeur">], icon: NotebookPen },
          { key: "notes" as const, label: p.notes, icon: Inbox, badge: unreadNotes },
        ]
      : []),
    { key: "roadmap", label: p.roadmap, icon: Route },
  ]

  return (
    <nav aria-label={p.label} className="sticky top-16 z-30 -mx-4 mt-6 border-b border-line bg-sand/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {items.map(({ key, label, icon: Icon, badge }) => {
          const current = key === active
          return (
            <li key={key} className="shrink-0">
              <Link
                to={key === "dossier" ? `/enfants/${childId}` : `/enfants/${childId}/${key}`}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-12 items-center gap-2 rounded-t-lg px-3 text-sm font-medium transition-colors sm:px-4",
                  current ? "text-teal" : "text-ink-muted hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
                {badge !== undefined && badge > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-teal px-1.5 text-xs font-semibold text-white tabular-nums">
                    {badge}
                    <span className="sr-only"> {p.unread(badge)}</span>
                  </span>
                )}
                {current && <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-teal" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
