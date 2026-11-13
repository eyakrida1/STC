import { motion, useReducedMotion } from "motion/react"

const COLORS = ["var(--cdis-pop-coral)", "var(--cdis-pop-sun)", "var(--cdis-pop-sky)", "var(--cdis-teal)"]

/** Petite célébration discrète (≈ 1 s) après une validation : quelques confettis. Rien si reduced-motion. */
export function Celebration({ burstKey }: { burstKey: number }) {
  const reduce = useReducedMotion()
  if (reduce || burstKey === 0) return null
  return (
    <div key={burstKey} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center">
      {Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2
        const dist = 60 + (i % 3) * 26
        return (
          <motion.span
            key={i}
            className="absolute size-2 rounded-[2px]"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + 30, opacity: 0, rotate: 180 + i * 20, scale: 0.6 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        )
      })}
    </div>
  )
}
