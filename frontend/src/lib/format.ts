import type { ISODate, ISODateTime } from "@/types"

const DEFAULT_LOCALE = "fr-FR"

/** « 13 nov. 2026 » */
export function formatDate(value: ISODate | ISODateTime, locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
}

/** « 13 novembre 2026 » */
export function formatDateLong(value: ISODate | ISODateTime, locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(value))
}

/** « il y a 3 jours », « hier »… */
export function formatRelative(value: ISODate | ISODateTime, locale = DEFAULT_LOCALE, now = new Date()): string {
  const diffMs = new Date(value).getTime() - now.getTime()
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const minutes = Math.round(diffMs / 60000)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour")
  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return rtf.format(days, "day")
  return formatDate(value, locale)
}

/** Date locale au format ISO (AAAA-MM-JJ), sans décalage UTC. */
export function localISODate(d = new Date()): ISODate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return localISODate(d)
}

export function ageFrom(birthDate: ISODate, now = new Date()): number {
  const b = new Date(birthDate)
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`
}

export function initials(p: { firstName: string; lastName: string }): string {
  return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase()
}
