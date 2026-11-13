import type { ReactNode } from "react"
import { Lock, Sparkles, Users, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ZoneTone = "private" | "shared" | "ai"

const TONES: Record<ZoneTone, { card: string; icon: string; badge: string; Icon: LucideIcon }> = {
  private: { card: "border-zone-private/40 bg-zone-private-soft", icon: "bg-zone-private text-white", badge: "text-zone-private-ink", Icon: Lock },
  shared: { card: "border-zone-shared/40 bg-zone-shared-soft", icon: "bg-zone-shared text-white", badge: "text-zone-shared-ink", Icon: Users },
  ai: { card: "border-zone-ai/40 bg-zone-ai-soft", icon: "bg-zone-ai text-white", badge: "text-zone-ai-ink", Icon: Sparkles },
}

/** Une des 3 sorties d'une séance : couleur, icône et une phrase qui dit qui la lira. */
export function NoteZone({
  tone,
  title,
  hint,
  children,
  footer,
  className,
  headingId,
}: {
  tone: ZoneTone
  title: ReactNode
  hint: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  headingId?: string
}) {
  const s = TONES[tone]
  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col gap-3 rounded-card border p-4 sm:p-5", s.card, className)}>
      <header className="flex items-start gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", s.icon)}>
          <s.Icon className="size-5" aria-hidden />
        </span>
        <span>
          <span id={headingId} className={cn("block text-base font-semibold", s.badge)}>
            {title}
          </span>
          <span className="block text-sm text-ink">{hint}</span>
        </span>
      </header>
      {children}
      {footer && <div className={cn("text-sm", s.badge)}>{footer}</div>}
    </section>
  )
}

/** Icône seule (liste des séances, détail). */
export function ZoneIcon({ tone, className }: { tone: ZoneTone; className?: string }) {
  const s = TONES[tone]
  return (
    <span className={cn("grid size-6 shrink-0 place-items-center rounded-md", s.icon, className)}>
      <s.Icon className="size-3.5" aria-hidden />
    </span>
  )
}
