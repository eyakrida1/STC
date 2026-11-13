import { addDays, localISODate } from "./format"
import type { ISODate } from "@/types"

/** Lundi de la semaine contenant `date` (ISO local). */
export function mondayOf(date: ISODate = localISODate()): ISODate {
  const d = new Date(`${date}T12:00:00`)
  const offset = (d.getDay() + 6) % 7 // lundi = 0
  return addDays(date, -offset)
}

/** Premier jour du mois (AAAA-MM-01). */
export function monthStart(date: ISODate = localISODate()): ISODate {
  return `${date.slice(0, 7)}-01`
}

export function addMonths(monthFirst: ISODate, n: number): ISODate {
  const d = new Date(`${monthFirst}T12:00:00`)
  d.setMonth(d.getMonth() + n, 1)
  return localISODate(d)
}

export function daysInMonth(monthFirst: ISODate): ISODate[] {
  const d = new Date(`${monthFirst}T12:00:00`)
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return Array.from({ length: n }, (_, i) => addDays(monthFirst, i))
}
