import { useEffect, useState } from "react"
import { Link, Outlet } from "react-router"
import * as api from "@/api"
import { useCurrentUser } from "@/auth/context"
import { useT } from "@/i18n/context"
import { homePathFor } from "@/lib/access"
import { Logo } from "./Logo"
import { NotificationsMenu } from "./NotificationsMenu"
import { UserMenu } from "./UserMenu"

/** Coque : barre du haut (logo, pôle, notifications, utilisateur) + contenu centré, 1200 px max. Pas de barre latérale. */
export function AppShell() {
  const t = useT()
  const user = useCurrentUser()
  const [poleName, setPoleName] = useState<string>("")

  useEffect(() => {
    api.getMyPole().then((p) => setPoleName(p.name))
  }, [user.poleId])

  return (
    <div className="min-h-dvh bg-sand">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t.app.skipToContent}
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-page items-center gap-3 px-4 sm:px-6">
          <Link to={homePathFor(user.role)} className="rounded-lg" aria-label={t.app.fullName}>
            <Logo />
          </Link>
          {poleName && (
            <>
              <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
              <span className="hidden text-sm font-medium text-ink-muted sm:block">{poleName}</span>
            </>
          )}
          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <NotificationsMenu />
            <UserMenu />
          </div>
        </div>
      </header>
      <main id="contenu" tabIndex={-1} className="mx-auto max-w-page px-4 py-8 outline-none sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
