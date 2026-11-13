// Petites règles de validation partagées par les formulaires (messages dans fr.ts).
import { localISODate } from "./format"

export type Errors<K extends string = string> = Partial<Record<K, string>>

export const isBlank = (v: string | null | undefined) => !v || !v.trim()

/** Téléphone tunisien : 8 chiffres, indicatif +216 facultatif, espaces tolérés. */
export function isValidPhone(v: string): boolean {
  const digits = v.replace(/[\s.-]/g, "")
  return /^(\+216|00216)?\d{8}$/.test(digits)
}

export function isFutureDate(v: string): boolean {
  return !!v && v > localISODate()
}

export function hasErrors(e: Errors): boolean {
  return Object.values(e).some(Boolean)
}
