import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** État vide : une icône, une phrase claire, éventuellement une action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-10 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-full bg-muted text-ink-muted">
        <Icon className="size-7" aria-hidden />
      </span>
      <p className="text-lg font-semibold text-ink">{title}</p>
      {description && <p className="text-base text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
