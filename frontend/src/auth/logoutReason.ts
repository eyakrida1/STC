import type { LogoutReason } from "./context"

const LOGOUT_REASON_KEY = "cdis.logoutReason"

export function rememberLogoutReason(reason: LogoutReason) {
  try {
    sessionStorage.setItem(LOGOUT_REASON_KEY, reason)
  } catch {
    /* ignore */
  }
}

/** Raison de la dernière déconnexion (lue une fois par la page de connexion). */
export function consumeLogoutReason(): LogoutReason | null {
  try {
    const r = sessionStorage.getItem(LOGOUT_REASON_KEY) as LogoutReason | null
    sessionStorage.removeItem(LOGOUT_REASON_KEY)
    return r
  } catch {
    return null
  }
}
