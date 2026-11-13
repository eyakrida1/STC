import type { CSSProperties } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useT } from "@/i18n/context"
import type { Bubble, BubbleKind } from "@/lib/bubbles"
import { MOOD_COLOR_VAR } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import type { MoodLevel } from "@/types"

/*
 * AvatarLive — l'« avatar vivant » de l'en-tête du dossier (zone POP autorisée).
 * - portrait rond 160 px ;
 * - halo animé couleur d'humeur : respiration lente (1-2), immobile (3), pulsation + étincelles (4-5) ;
 * - bulles pop en orbite (hobbies, intérêts, compétences ; 8 max) qui flottent ; info-bulle au survol / focus ;
 * - tout est coupé si prefers-reduced-motion.
 * Géométrie (≥ sm) : zone 500 × 360, ellipse 182 × 140 autour du centre ; bulles ≤ 144 px de large :
 * la bulle la plus proche reste à > 100 px du centre (portrait 80 px + halo) → jamais sur le portrait.
 * Sous sm, les bulles passent sous le portrait, en ligne.
 */

const ORBIT = { w: 500, h: 360, rx: 182, ry: 140 }
const PORTRAIT = 160

const BUBBLE_STYLE: Record<BubbleKind, string> = {
  hobby: "border-pop-coral bg-pop-coral/15",
  interest: "border-pop-sky bg-pop-sky/15",
  skill: "border-pop-sun bg-pop-sun/20",
}
const BUBBLE_ICON: Record<BubbleKind, string> = {
  hobby: "text-pop-coral",
  interest: "text-pop-sky",
  skill: "text-pop-sun",
}

function orbitPosition(i: number, n: number) {
  // départ en haut, répartition régulière ; léger décalage pour éviter l'alignement parfait
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n + (n % 2 === 0 ? Math.PI / n : 0)
  return {
    x: ORBIT.w / 2 + ORBIT.rx * Math.cos(angle),
    y: ORBIT.h / 2 + ORBIT.ry * Math.sin(angle),
  }
}

function Sparkles({ color }: { color: string }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  const r = PORTRAIT / 2 + 26
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3 + Math.PI / 6
        return (
          <motion.svg
            key={i}
            aria-hidden
            viewBox="0 0 24 24"
            className="absolute size-3.5"
            style={{
              left: `calc(50% + ${Math.cos(a) * r}px - 7px)`, // logical-ok (décoratif, symétrique)
              top: `calc(50% + ${Math.sin(a) * r}px - 7px)`,
            }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4], rotate: [0, 45, 90] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3, repeatDelay: 0.6, ease: "easeInOut" }}
          >
            <path d="M12 0c.7 6.2 5.1 10.6 12 12-6.9 1.4-11.3 5.8-12 12-.7-6.2-5.1-10.6-12-12C6.9 10.6 11.3 6.2 12 0Z" fill={i % 2 ? "var(--cdis-pop-sun)" : color} />
          </motion.svg>
        )
      })}
    </>
  )
}

function Portrait({ src, alt, mood }: { src: string; alt: string; mood: MoodLevel }) {
  const reduce = useReducedMotion()
  const color = MOOD_COLOR_VAR[mood]
  const calm = mood <= 2
  const lively = mood >= 4
  const haloAnim = reduce || mood === 3
    ? undefined
    : calm
      ? { animate: { scale: [1, 1.05, 1], opacity: [0.35, 0.6, 0.35] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const } }
      : { animate: { scale: [1, 1.13, 1], opacity: [0.45, 0.8, 0.45] }, transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const } }

  return (
    <div className="relative grid place-items-center" style={{ width: PORTRAIT + 48, height: PORTRAIT + 48 }}>
      {/* halo doux (animé) */}
      <motion.div
        key={`halo-${mood}`}
        aria-hidden
        className="absolute rounded-full"
        style={{ width: PORTRAIT + 32, height: PORTRAIT + 32, backgroundColor: color, opacity: 0.45, filter: "blur(6px)" }}
        {...haloAnim}
      />
      {/* anneau net couleur d'humeur */}
      <div aria-hidden className="absolute rounded-full" style={{ width: PORTRAIT + 12, height: PORTRAIT + 12, backgroundColor: color }} />
      {lively && <Sparkles color={color} />}
      <motion.img
        key={src}
        src={src}
        alt={alt}
        draggable={false}
        width={PORTRAIT}
        height={PORTRAIT}
        className="relative rounded-full border-4 border-surface bg-surface object-cover"
        style={{ width: PORTRAIT, height: PORTRAIT }}
        initial={reduce ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      />
    </div>
  )
}

function BubbleChip({ bubble, index }: { bubble: Bubble; index: number }) {
  const t = useT()
  const reduce = useReducedMotion()
  const Icon = bubble.icon
  const kindLabel = t.pages.child.bubbleKinds[bubble.kind]
  return (
    <motion.span
      className="inline-block"
      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
      animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -5, 0] }}
      transition={
        reduce
          ? undefined
          : {
              opacity: { duration: 0.3, delay: 0.15 + index * 0.06 },
              scale: { type: "spring", stiffness: 260, damping: 16, delay: 0.15 + index * 0.06 },
              y: { duration: 3.4 + (index % 3) * 0.7, repeat: Infinity, ease: "easeInOut", delay: index * 0.25 },
            }
      }
    >
      <Tooltip>
        <TooltipTrigger
          render={<span tabIndex={0} />}
          className={cn(
            "inline-flex h-8 max-w-36 cursor-default items-center gap-1.5 rounded-full border-2 px-2.5 text-xs font-semibold text-ink shadow-sm",
            BUBBLE_STYLE[bubble.kind],
          )}
        >
          <Icon className={cn("size-4 shrink-0", BUBBLE_ICON[bubble.kind])} aria-hidden />
          <span className="sr-only">{kindLabel} : </span>
          <span className="truncate">{bubble.label}</span>
        </TooltipTrigger>
        <TooltipContent>
          {kindLabel} : {bubble.label}
        </TooltipContent>
      </Tooltip>
    </motion.span>
  )
}

export function AvatarLive({
  src,
  name,
  mood,
  bubbles,
  footer,
  className,
}: {
  /** image du portrait (avatarUrl de l'enfant, ou avatar de démonstration) */
  src: string
  name: string
  mood: MoodLevel
  bubbles: Bubble[]
  /** sous le portrait : MoodBadge « Humeur : bien · partagée par le psy le 12/11 » */
  footer?: React.ReactNode
  className?: string
}) {
  const t = useT()
  const n = bubbles.length

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className="relative grid w-full place-items-center sm:w-[var(--orbit-w)] sm:h-[var(--orbit-h)]"
        style={{ "--orbit-w": `${ORBIT.w}px`, "--orbit-h": `${ORBIT.h}px` } as CSSProperties}
      >
        <Portrait src={src} alt={t.components.avatarAlt(name)} mood={mood} />

        {n > 0 && (
          <ul
            aria-label={t.pages.child.bubblesLabel(name)}
            className="mt-2 flex flex-wrap justify-center gap-2 sm:absolute sm:inset-0 sm:mt-0 sm:block"
          >
            {bubbles.map((b, i) => {
              const { x, y } = orbitPosition(i, n)
              return (
                <li
                  key={`${b.kind}-${b.label}`}
                  // position d'orbite (≥ sm uniquement : sous sm, la liste est en flux normal).
                  // En RTL, « start » part de la droite : l'orbite est simplement mise en miroir.
                  className="sm:absolute sm:start-(--x) sm:top-(--y) sm:-translate-x-1/2 sm:-translate-y-1/2 rtl:sm:translate-x-1/2"
                  style={{ "--x": `${x}px`, "--y": `${y}px` } as CSSProperties}
                >
                  <BubbleChip bubble={b} index={i} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {footer}
    </div>
  )
}
