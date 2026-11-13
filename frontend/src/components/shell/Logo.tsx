import { useT } from "@/i18n/context"

/** Marque CDIS : un pictogramme simple (maison + cœur) et le sigle. */
export function Logo({ className }: { className?: string }) {
  const t = useT()
  return (
    <span className={className}>
      <span className="inline-flex items-center gap-2">
        <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
          <rect width="32" height="32" rx="9" fill="var(--cdis-teal)" />
          <path d="M9 15.5 16 9.5l7 6V23a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1z" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinejoin="round" />
          <path d="M16 21.2s-3-1.8-3-3.7a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.9-3 3.7-3 3.7z" fill="#fff" />
        </svg>
        <span className="text-lg font-bold tracking-tight text-ink">{t.app.name}</span>
      </span>
    </span>
  )
}
