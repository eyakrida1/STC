import { staffAvatarUri } from "@/lib/avatar"
import { cn } from "@/lib/utils"

/** Photo d'un intervenant (sobre, sans halo). */
export function UserAvatar({
  seed,
  name,
  size = "md",
  className,
}: {
  seed: string
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const box = { sm: "size-7", md: "size-9", lg: "size-16" }[size]
  return (
    <img
      src={staffAvatarUri(seed)}
      alt={name}
      draggable={false}
      className={cn("shrink-0 rounded-full border border-line bg-muted object-cover", box, className)}
    />
  )
}
