import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface InfoItem {
  label: ReactNode
  value: ReactNode
  /** occupe toute la largeur */
  wide?: boolean
}

/** Liste « libellé / valeur » des cartes du dossier (2 colonnes à partir de sm). */
export function InfoList({ items, className }: { items: InfoItem[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((it, i) => (
        <div key={i} className={cn("min-w-0", it.wide && "sm:col-span-2")}>
          <dt className="text-sm text-ink-muted">{it.label}</dt>
          <dd className="mt-0.5 text-base break-words text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Petites puces neutres (allergies, hobbies…) ; `empty` si la liste est vide. */
export function Tags({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <span className="text-ink-muted">{empty}</span>
  return (
    <ul className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <li key={v} className="rounded-full bg-muted px-2.5 py-0.5 text-sm text-ink">
          {v}
        </li>
      ))}
    </ul>
  )
}

export function Phone({ value }: { value: string | null }) {
  if (!value) return <span className="text-ink-muted">—</span>
  return (
    <a href={`tel:${value.replace(/\s/g, "")}`} dir="ltr" className="text-teal underline-offset-2 hover:underline">
      {value}
    </a>
  )
}
