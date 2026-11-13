import { staffAvatarUri } from "@/lib/avatar"
import { cn } from "@/lib/utils"

/** Photo d'un intervenant (sobre, sans halo) : sa photo si elle existe, sinon l'avatar de démonstration. */
export function UserAvatar({
  seed,
  name,
  photoUrl,
  size = "md",
  className,
}: {
  seed: string
  name: string
  photoUrl?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  const box = { sm: "size-7", md: "size-9", lg: "size-16", xl: "size-28" }[size]
  return (
    <img
      src={photoUrl || staffAvatarUri(seed)}
      alt={name}
      draggable={false}
      className={cn("shrink-0 rounded-full border border-line bg-muted object-cover", box, className)}
    />
  )
}
