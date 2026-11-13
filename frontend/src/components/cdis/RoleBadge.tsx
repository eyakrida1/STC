import { cn } from "@/lib/utils"
import { ROLE_DOT, ROLE_SOFT_BG } from "@/lib/tokens"
import { useT } from "@/i18n/context"
import type { Role } from "@/types"
import { pill, sizes } from "./badge-styles"

/** Pastille de rôle : point de couleur + libellé (texte en encre pour garder le contraste AA). */
export function RoleBadge({
  role,
  size = "sm",
  plain = false,
  className,
}: {
  role: Role
  size?: keyof typeof sizes
  /** sans fond : simple repère coloré + libellé */
  plain?: boolean
  className?: string
}) {
  const t = useT()
  return (
    <span className={cn(pill, sizes[size], "text-ink", plain ? "px-0" : ROLE_SOFT_BG[role], className)}>
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", ROLE_DOT[role])} />
      {t.roles[role]}
    </span>
  )
}
