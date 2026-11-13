import { useNavigate } from "react-router"
import { ChevronDown, LogOut, RotateCcw, UserRound } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { useAuth, useCurrentUser } from "@/auth/context"
import { RoleBadge, UserAvatar } from "@/components/cdis"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useT } from "@/i18n/context"
import { fullName } from "@/lib/format"

export function UserMenu() {
  const t = useT()
  const user = useCurrentUser()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const name = fullName(user)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.shell.userMenu}
        className="flex items-center gap-2 rounded-full py-1 ps-1 pe-2 hover:bg-muted sm:pe-3"
      >
        <UserAvatar seed={user.avatarSeed} photoUrl={user.photoUrl} name="" size="md" />
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="text-sm font-medium text-ink">{name}</span>
          <RoleBadge role={user.role} plain className="h-auto text-xs font-normal text-ink-muted" />
        </span>
        <ChevronDown className="size-4 text-ink-muted" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <UserAvatar seed={user.avatarSeed} photoUrl={user.photoUrl} name="" size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <RoleBadge role={user.role} className="mt-1" />
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profil")}>
          <UserRound aria-hidden />
          {t.shell.myProfile}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await api.resetDemo()
            toast.success(t.shell.resetDemoDone)
            navigate(0)
          }}
        >
          <RotateCcw aria-hidden />
          {t.shell.resetDemo}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await logout("manual")
            navigate("/connexion", { replace: true })
          }}
        >
          <LogOut aria-hidden />
          {t.shell.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
