import { createContext, useContext } from "react"
import { fr, type Dictionary } from "./fr"

export type Locale = "fr" // "ar" viendra plus tard
export type Direction = "ltr" | "rtl"

export const DICTIONARIES: Record<Locale, Dictionary> = { fr }
export const LOCALE_DIR: Record<Locale, Direction> = { fr: "ltr" }
export const INTL_LOCALE: Record<Locale, string> = { fr: "fr-FR" }

export interface I18nValue {
  t: Dictionary
  locale: Locale
  intlLocale: string
  dir: Direction
  /** Force le sens de lecture (aperçu RTL du styleguide). */
  setDir: (dir: Direction | null) => void
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error("useI18n doit être utilisé dans <I18nProvider>")
  return value
}

/** Raccourci : const t = useT() */
export function useT(): Dictionary {
  return useI18n().t
}
