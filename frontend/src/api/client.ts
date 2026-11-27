/**
 * Socle de la couche api/ : appels HTTP au backend Django (dossier backend/).
 * - session = cookie HttpOnly posé par Django (credentials: "include") ;
 * - protection CSRF : en-tête X-CSRFToken lu dans le cookie `csrftoken` ;
 * - erreurs { error, message } → ApiError(code, message), mêmes codes qu'avant.
 * Les contrôles d'accès sont faits par le backend ; le front ne fait qu'adapter l'affichage (lib/access.ts).
 * Les pages n'importent que src/api/*.
 */

export type ApiErrorCode = "unauthorized" | "forbidden" | "not_found" | "invalid" | "conflict"

export class ApiError extends Error {
  readonly code: ApiErrorCode
  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
    this.name = "ApiError"
  }
}

/** Racine de l'API : `/api` (proxy Vite en développement, même origine en production) ou VITE_API_URL. */
export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "/api").replace(/\/$/, "")

/** Émis quand le serveur répond 401 alors qu'on croyait être connecté (session expirée côté serveur). */
export const UNAUTHORIZED_EVENT = "cdis:unauthorized"

const CODES: ApiErrorCode[] = ["unauthorized", "forbidden", "not_found", "invalid", "conflict"]
const CODE_BY_STATUS: Record<number, ApiErrorCode> = { 401: "unauthorized", 403: "forbidden", 404: "not_found", 409: "conflict" }

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

let csrfPromise: Promise<void> | null = null

async function ensureCsrf(): Promise<string> {
  let token = readCookie("csrftoken")
  if (!token) {
    csrfPromise ??= fetch(`${API_BASE}/auth/csrf`, { credentials: "include" }).then(() => undefined)
    try {
      await csrfPromise
    } finally {
      csrfPromise = null
    }
    token = readCookie("csrftoken")
  }
  return token ?? ""
}

type Method = "GET" | "POST" | "PUT" | "DELETE"
type Query = Record<string, string | undefined | null>

export function withQuery(path: string, query: Query): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== "") params.set(k, v)
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

/** Appel JSON au backend. Renvoie le corps décodé (null pour les opérations sans résultat). */
export async function request<T>(method: Method, path: string, body?: unknown, options: { silent401?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (method !== "GET") headers["X-CSRFToken"] = await ensureCsrf()

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.ok) {
    const text = await response.text()
    return (text ? JSON.parse(text) : null) as T
  }

  let payload: { error?: string; message?: string } = {}
  try {
    payload = await response.json()
  } catch {
    /* corps non JSON (proxy, erreur serveur) */
  }
  const code = CODES.includes(payload.error as ApiErrorCode)
    ? (payload.error as ApiErrorCode)
    : (CODE_BY_STATUS[response.status] ?? "invalid")
  // 403 « CSRF » de Django (corps HTML) après une rotation du jeton : on oublie le cookie pour le prochain essai
  if (response.status === 403 && !payload.error) document.cookie = "csrftoken=; Max-Age=0; path=/"
  if (code === "unauthorized" && !options.silent401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  throw new ApiError(code, payload.message)
}

export const get = <T>(path: string, query?: Query) => request<T>("GET", query ? withQuery(path, query) : path)
export const post = <T>(path: string, body: unknown = {}) => request<T>("POST", path, body)
export const put = <T>(path: string, body: unknown) => request<T>("PUT", path, body)
export const del = <T>(path: string) => request<T>("DELETE", path)

/** Segment d'URL sûr (identifiants). */
export const seg = (value: string) => encodeURIComponent(value)
