import { motion, useReducedMotion } from "motion/react"

/**
 * Illustration abstraite de la page de connexion : formes organiques aux couleurs pop, aucun visage.
 * Exception documentée à la règle « pop réservée à l'avatar et à la roadmap » (voir CLAUDE.md).
 * Purement décorative (aria-hidden) ; le mouvement est coupé si prefers-reduced-motion.
 */
export function LoginIllustration({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const float = (dy: number, duration: number, delay = 0) =>
    reduce
      ? {}
      : {
          animate: { y: [0, dy, 0], rotate: [0, dy > 0 ? 3 : -3, 0] },
          transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const },
        }

  return (
    <svg viewBox="0 0 480 480" className={className} aria-hidden focusable="false">
      {/* grand fond organique sarcelle doux */}
      <path
        d="M78 112C130 40 258 24 340 64s132 132 104 222-112 152-214 150S48 384 30 300 26 184 78 112Z"
        fill="var(--cdis-teal-soft)"
      />
      {/* ciel */}
      <motion.path
        {...float(-10, 7)}
        d="M300 92c40-12 86 8 98 48s-14 78-54 86-84-10-92-50 8-72 48-84Z"
        fill="var(--cdis-pop-sky)"
        opacity="0.85"
      />
      {/* soleil */}
      <motion.circle {...float(8, 6, 0.6)} cx="148" cy="150" r="46" fill="var(--cdis-pop-sun)" opacity="0.9" />
      {/* corail : grande forme centrale */}
      <motion.path
        {...float(-8, 8, 0.3)}
        d="M150 250c26-50 98-70 150-42s70 98 36 142-104 58-150 32-62-82-36-132Z"
        fill="var(--cdis-pop-coral)"
        opacity="0.9"
      />
      {/* petites formes */}
      <motion.circle {...float(6, 5, 1)} cx="96" cy="330" r="18" fill="var(--cdis-pop-sky)" opacity="0.7" />
      <motion.circle {...float(-6, 5.5, 0.2)} cx="388" cy="330" r="14" fill="var(--cdis-pop-sun)" opacity="0.8" />
      <motion.circle {...float(5, 6.5, 0.8)} cx="250" cy="96" r="10" fill="var(--cdis-pop-coral)" opacity="0.8" />
      {/* trait doux qui relie les formes : « ensemble » */}
      <path
        d="M120 196c40 30 70 40 112 34s76-34 112-30"
        fill="none"
        stroke="var(--cdis-teal)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
        opacity="0.55"
      />
    </svg>
  )
}
