import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

/** En-tête de page : titre unique (h1), description courte, actions à droite (à gauche en RTL). */
export function PageHeader({
  title,
  description,
  actions,
  back,
  leading,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  /** élément avant le titre (ex. avatar) */
  leading?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4", className)}>
      {back && (
        <Link
          to={back.to}
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {leading}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 text-base text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
