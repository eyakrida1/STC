import { motion, useReducedMotion } from "motion/react"
import { childAvatarUri } from "@/lib/avatar"
import { MOOD_COLOR_VAR } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import { useT } from "@/i18n/context"
import type { MoodLevel, Sex } from "@/types"

const SIZES = {
  sm: { box: "size-10", ring: 3 },
  md: { box: "size-16", ring: 4 }, // 64 px (cartes « Mes enfants »)
  lg: { box: "size-24", ring: 5 },
  xl: { box: "size-40", ring: 7 },
} as const

export type ChildAvatarSize = keyof typeof SIZES

/**
 * Avatar de l'enfant — zone « pop » autorisée.
 * Version simple : image ronde + halo de la couleur d'humeur (enrichie au prompt 2 : expression, bulles d'intérêts…).
 */
export function ChildAvatar({
  seed,
  name,
  mood,
  sex,
  size = "md",
  animated = size === "lg" || size === "xl",
  className,
}: {
  seed: string
  name: string
  mood: MoodLevel
  /** oriente la coiffure de l'avatar de démonstration */
  sex?: Sex
  size?: ChildAvatarSize
  /** halo qui « respire » doucement (désactivé si prefers-reduced-motion) */
  animated?: boolean
  className?: string
}) {
  const t = useT()
  const reduce = useReducedMotion()
  const { box, ring } = SIZES[size]
  const color = MOOD_COLOR_VAR[mood]
  const breathe = animated && !reduce

  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", box, className)}>
      {/* halo d'humeur */}
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 0 ${ring}px ${color}`, opacity: 0.9 }}
        animate={breathe ? { scale: [1, 1.06, 1], opacity: [0.9, 0.55, 0.9] } : undefined}
        transition={breathe ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
      <motion.img
        key={mood}
        src={childAvatarUri(seed, sex, mood)}
        alt={t.components.avatarAlt(name)}
        draggable={false}
        className="relative size-full rounded-full bg-surface object-cover"
        initial={reduce ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      />
    </span>
  )
}
