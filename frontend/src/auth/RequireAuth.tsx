import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { ShieldAlert } from "lucide-react"
import { EmptyState } from "@/components/cdis/EmptyState"
import { FullPageLoader } from "@/components/cdis/FullPageLoader"
import { useT } from "@/i18n/context"
import type { Role } from "@/types"
import { useAuth } from "./context"

/** Route protégée : connecté obligatoire, et rôle autorisé si `roles` est fourni. */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, initializing } = useAuth()
  const location = useLocation()
  const t = useT()

  if (initializing) return <FullPageLoader />
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t.auth.forbiddenTitle}
        description={t.auth.forbiddenText}
        className="mt-16"
      />
    )
  }
  return <>{children}</>
}
