import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import * as api from "@/api"
import { INACTIVITY_TIMEOUT_MS } from "@/lib/access"
import type { User } from "@/types"
import { AuthContext, type AuthValue, type LogoutReason } from "./context"
import { rememberLogoutReason } from "./logoutReason"

const ACTIVITY_KEY = "cdis.lastActivity"
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"] as const

function readLastActivity(): number {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0
  } catch {
    return 0
  }
}

function writeLastActivity(ts: number) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(ts))
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)
  const lastWrite = useRef(0)

  const logout = useCallback(async (reason: LogoutReason = "manual") => {
    rememberLogoutReason(reason)
    await api.logout()
    setUser(null)
  }, [])

  // Restauration de session au démarrage (expirée si inactif depuis plus de 30 min, même onglet fermé).
  useEffect(() => {
    let cancelled = false
    api.getCurrentUser().then(async (u) => {
      if (cancelled) return
      if (u && Date.now() - readLastActivity() > INACTIVITY_TIMEOUT_MS) {
        await logout("inactivity")
      } else {
        setUser(u)
      }
      setInitializing(false)
    })
    return () => {
      cancelled = true
    }
  }, [logout])

  // Suivi d'activité + déconnexion automatique après 30 minutes d'inactivité (postes partagés).
  useEffect(() => {
    if (!user) return
    const markActive = () => {
      const now = Date.now()
      if (now - lastWrite.current < 5000) return // limite les écritures
      lastWrite.current = now
      writeLastActivity(now)
    }
    lastWrite.current = 0
    markActive()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }))
    const timer = window.setInterval(() => {
      // lastActivity est partagé entre onglets via localStorage
      if (Date.now() - readLastActivity() > INACTIVITY_TIMEOUT_MS) void logout("inactivity")
    }, 30_000)
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive))
      window.clearInterval(timer)
    }
  }, [user, logout])

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.login(username, password)
    writeLastActivity(Date.now())
    setUser(u)
    return u
  }, [])

  const refreshUser = useCallback(async () => {
    setUser(await api.getCurrentUser())
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ user, role: user?.role ?? null, initializing, login, logout, refreshUser }),
    [user, initializing, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
