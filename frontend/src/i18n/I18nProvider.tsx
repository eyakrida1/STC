import { useLayoutEffect, useMemo, useState, type ReactNode } from "react"
import { DICTIONARIES, I18nContext, INTL_LOCALE, LOCALE_DIR, type Direction, type I18nValue, type Locale } from "./context"

/** Fournit les textes et pose `lang` + `dir` sur <html> (racine unique du sens de lecture). */
export function I18nProvider({ children, locale = "fr" }: { children: ReactNode; locale?: Locale }) {
  const [dirOverride, setDirOverride] = useState<Direction | null>(null)
  const dir = dirOverride ?? LOCALE_DIR[locale]

  useLayoutEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [locale, dir])

  const value = useMemo<I18nValue>(
    () => ({
      t: DICTIONARIES[locale],
      locale,
      intlLocale: INTL_LOCALE[locale],
      dir,
      setDir: setDirOverride,
    }),
    [locale, dir],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
