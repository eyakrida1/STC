import { createContext, useContext } from "react"
import type { Role, User } from "@/types"

export type LogoutReason = "manual" | "inactivity"

export interface AuthValue {
  user: User | null
  role: Role | null
  /** true pendant la restauration de la session au démarrage */
  initializing: boolean
  login: (username: string, password: string) => Promise<User>
  logout: (reason?: LogoutReason) => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const v = useContext(AuthContext)
  if (!v) throw new Error("useAuth doit être utilisé dans <AuthProvider>")
  return v
}

/** Utilisateur connecté (à n'utiliser que sous une route protégée). */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error("useCurrentUser appelé hors d'une route protégée")
  return user
}
