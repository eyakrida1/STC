/**
 * Socle de la couche api/ simulée.
 * - délai réseau simulé (300 ms) ;
 * - état persisté dans localStorage ;
 * - contrôles d'accès appliqués ici, comme le fera le backend Django.
 * Les pages n'importent que src/api/* : jamais src/mocks/*.
 */
import { buildSeed, DEMO_DB_VERSION, type DemoDatabase } from "@/mocks"
import type { Child, User } from "@/types"

const DB_KEY = "cdis.demo.db"
const SESSION_KEY = "cdis.demo.session" // équivalent du cookie de session
export const SIMULATED_LATENCY_MS = 300

export type ApiErrorCode = "unauthorized" | "forbidden" | "not_found" | "invalid" | "conflict"

export class ApiError extends Error {
  readonly code: ApiErrorCode
  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
    this.name = "ApiError"
  }
}

let cache: DemoDatabase | null = null

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* stockage indisponible : la démo fonctionne en mémoire */
  }
}

export function db(): DemoDatabase {
  if (cache) return cache
  const raw = readStorage(DB_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoDatabase
      if (parsed.version === DEMO_DB_VERSION) {
        cache = parsed
        return cache
      }
    } catch {
      /* données corrompues : on réinitialise */
    }
  }
  cache = buildSeed()
  persist()
  return cache
}

export function persist() {
  if (cache) writeStorage(DB_KEY, JSON.stringify(cache))
}

/** Exécute une opération avec la latence simulée et renvoie une copie (pas de mutation partagée avec l'UI). */
export async function simulate<T>(operation: () => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS))
  const result = operation()
  return result === undefined ? result : structuredClone(result)
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

// ───────────────────────────── Session (cookie simulé)
export function getSessionUserId(): string | null {
  return readStorage(SESSION_KEY)
}

export function setSessionUserId(userId: string | null) {
  writeStorage(SESSION_KEY, userId)
}

/** Utilisateur connecté, ou erreur `unauthorized`. */
export function requireUser(): User {
  const id = getSessionUserId()
  const user = id ? db().users.find((u) => u.id === id) : undefined
  if (!user) throw new ApiError("unauthorized")
  return user
}

// ───────────────────────────── Contrôles d'accès communs
export function canSeeChild(user: User, child: Child): boolean {
  if (child.poleId !== user.poleId) return false
  if (user.role === "directeur") return true
  return child.assigned[user.role] === user.id
}

export function requireChild(user: User, childId: string): Child {
  const child = db().children.find((c) => c.id === childId)
  if (!child) throw new ApiError("not_found")
  if (!canSeeChild(user, child)) throw new ApiError("forbidden")
  return child
}

/** Réinitialise toutes les données de démonstration (garde la session en cours). */
export function resetDemoSync() {
  cache = buildSeed()
  persist()
}
