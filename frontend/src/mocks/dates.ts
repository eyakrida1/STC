// Dates relatives au jour de l'initialisation de la démo, pour que les données restent « fraîches ».
import type { ISODate, ISODateTime } from "@/types"

export function daysAgo(n: number, base = new Date()): ISODate {
  const d = new Date(base)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return toISODate(d)
}

export function daysAhead(n: number, base = new Date()): ISODate {
  return daysAgo(-n, base)
}

export function monthsAgo(n: number, day = 5, base = new Date()): ISODate {
  const d = new Date(base.getFullYear(), base.getMonth() - n, day, 12)
  return toISODate(d)
}

export function at(date: ISODate, hour = 10, minute = 0): ISODateTime {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d, hour, minute).toISOString()
}

export function yearsAgo(years: number, monthOffset = 0, day = 14, base = new Date()): ISODate {
  return toISODate(new Date(base.getFullYear() - years, base.getMonth() - monthOffset, day, 12))
}

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
