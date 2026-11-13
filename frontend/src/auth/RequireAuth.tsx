import { useEffect, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { toast } from "sonner"
import { FullPageLoader } from "@/components/cdis/FullPageLoader"
import { useT } from "@/i18n/context"
import { homePathFor } from "@/lib/access"
import type { Role } from "@/types"
import { useAuth } from "./context"

/** Rôle non autorisé : retour à la page d'accueil du rôle, avec un message discret. */
function ForbiddenRedirect({ role }: { role: Role }) {
  const t = useT()
  useEffect(() => {
    toast.info(t.auth.forbiddenTitle, { id: "forbidden", description: t.auth.forbiddenText }) // id : pas de doublon
  }, [t])
  return <Navigate to={homePathFor(role)} replace />
}

/** Route protégée : connecté obligatoire, et rôle autorisé si `roles` est fourni (sinon redirection). */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <FullPageLoader />
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <ForbiddenRedirect role={user.role} />
  return <>{children}</>
}
