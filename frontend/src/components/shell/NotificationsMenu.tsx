import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Bell, CheckCheck } from "lucide-react"
import * as api from "@/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/i18n/context"
import { useDataChanged } from "@/lib/events"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"

export function NotificationsMenu() {
  const { t, intlLocale } = useI18n()
  const navigate = useNavigate()
  const [items, setItems] = useState<api.NotificationView[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    api
      .listMyNotifications()
      .then((list) => {
        setItems(list)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    load()
    const id = window.setInterval(load, 60_000)
    return () => window.clearInterval(id)
  }, [load])

  // une note lue, une séance partagée… : la cloche se met à jour sans attendre
  useDataChanged(load)

  const unread = items.filter((n) => !n.readAt).length

  const open = async (n: api.NotificationView) => {
    if (!n.readAt) await api.markNotificationRead(n.id)
    load()
    // chaque notification ouvre l'onglet utile du dossier
    const tab = n.kind === "note_recue" ? "/notes" : n.kind === "validation_attendue" || n.kind === "roadmap_mise_a_jour" ? "/roadmap" : ""
    if (n.childId) navigate(`/enfants/${n.childId}${tab}`)
  }

  return (
    <DropdownMenu onOpenChange={(o) => o && load()}>
      <DropdownMenuTrigger
        aria-label={t.notifications.unreadAria(unread)}
        className="relative grid size-10 place-items-center rounded-full text-ink hover:bg-muted"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-teal px-1 text-xs leading-5 font-semibold text-white tabular-nums ring-2 ring-surface">
            {unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-sm font-semibold text-ink">{t.notifications.title}</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={async () => {
                await api.markAllNotificationsRead()
                load()
              }}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-teal hover:bg-teal-soft"
            >
              <CheckCheck className="size-4" aria-hidden />
              {t.notifications.markAllRead}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {!loaded ? (
          <p className="px-2 py-6 text-center text-sm text-ink-muted">{t.app.loading}</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-ink-muted">{t.notifications.empty}</p>
        ) : (
          items.slice(0, 8).map((n) => (
            <DropdownMenuItem key={n.id} onClick={() => open(n)} className="items-start gap-3 py-2.5">
              <span
                aria-hidden
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-teal")}
              />
              <span className="flex flex-col gap-0.5">
                <span className={cn("text-sm text-ink", !n.readAt && "font-medium")}>
                  {t.notifications.kinds[n.kind](n.childFirstName ?? "")}
                </span>
                <span className="text-xs text-ink-muted">{formatRelative(n.createdAt, intlLocale)}</span>
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
