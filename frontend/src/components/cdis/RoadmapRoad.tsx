import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { animate, useReducedMotion } from "motion/react"
import { X } from "lucide-react"
import { useI18n } from "@/i18n/context"
import { formatDateLong } from "@/lib/format"
import { samplePath } from "@/lib/pathSampler"
import { MOOD_COLOR_VAR, PHASE_COLOR_VAR } from "@/lib/tokens"
import { useMediaQuery } from "@/lib/useMediaQuery"
import { cn } from "@/lib/utils"
import { PHASES, type ISODate, type MoodLevel, type PhaseId, type RoadmapPartKey } from "@/types"

/*
 * RoadmapRoad — la roadmap dessinée comme une route (zone POP autorisée).
 * Horizontale (gauche → droite) à partir de 640 px, verticale (haut → bas) en dessous.
 * - 5 panneaux = 5 phases ; franchies colorées, à venir en pointillés ;
 * - l'avatar avance du départ à sa position (≈ 1,5 s, une fois) ; immobile si prefers-reduced-motion ;
 * - fanions par partie (éducation ambre, psychologique violet, sociale bleu) : atteints pleins et datés derrière
 *   l'avatar, prochains pas en contour devant ; clic / Entrée → info-bulle ;
 * - retour au centre : petit détour sur la route.
 */

export interface RoadFlag {
  id: string
  part: RoadmapPartKey
  label: string
  date: ISODate
  reached: boolean
}

const PART_COLOR: Record<RoadmapPartKey, string> = {
  education: "var(--cdis-role-educateur)",
  psychologique: "var(--cdis-role-psychologue)",
  sociale: "var(--cdis-role-social)",
}

/** Position des 5 panneaux le long de la route (0 = départ, 1 = arrivée). */
const STOPS: Record<PhaseId, number> = { 1: 0.1, 2: 0.3, 3: 0.5, 4: 0.7, 5: 0.88 }

const LAYOUTS = {
  horizontal: {
    w: 1000,
    h: 360,
    road: "M 40 270 C 170 270 200 130 340 140 S 540 290 660 220 S 850 90 960 130",
    hills: [
      "M0 250 Q 180 170 360 230 T 720 220 T 1000 200 V360 H0 Z",
      "M0 300 Q 250 250 500 300 T 1000 290 V360 H0 Z",
    ],
    sun: { x: 900, y: 50 },
    trees: [
      [120, 215],
      [260, 300],
      [470, 190],
      [560, 320],
      [780, 300],
      [880, 210],
    ],
  },
  vertical: {
    w: 360,
    h: 1000,
    road: "M 180 30 C 180 150 60 190 90 320 S 300 450 260 580 S 70 720 110 840 S 230 930 220 975",
    hills: ["M0 380 Q 90 300 200 360 T 360 340 V1000 H0 Z", "M0 760 Q 120 700 220 760 T 360 740 V1000 H0 Z"],
    sun: { x: 310, y: 60 },
    trees: [
      [60, 120],
      [300, 250],
      [40, 520],
      [320, 690],
      [50, 900],
      [300, 930],
    ],
  },
} as const

type Pt = { x: number; y: number }

export function RoadmapRoad({
  phase,
  entryDate,
  returnDate,
  avatar,
  flags,
  className,
}: {
  phase: PhaseId
  entryDate: ISODate
  /** date du retour au centre (dernier séjour) : dessine un détour */
  returnDate?: ISODate | null
  avatar: { src: string; name: string; mood: MoodLevel }
  flags: RoadFlag[]
  className?: string
}) {
  const { t, intlLocale } = useI18n()
  const R = t.roadmap.road
  const reduce = useReducedMotion()
  const wide = useMediaQuery("(min-width: 640px)")
  const L = wide ? LAYOUTS.horizontal : LAYOUTS.vertical
  const sampler = useMemo(() => samplePath(L.road), [L.road])
  const len = sampler.length
  const [progress, setProgress] = useState(() => (reduce ? (phase === 5 ? STOPS[5] + 0.05 : STOPS[phase] + 0.08) : 0))
  const [selected, setSelected] = useState<string | null>(null)
  const [now] = useState(() => Date.now()) // « aujourd'hui », figé au montage

  const avatarT = phase === 5 ? STOPS[5] + 0.05 : STOPS[phase] + 0.08

  // l'avatar avance une seule fois à l'ouverture
  useEffect(() => {
    if (reduce) return // avatar directement à sa place (état initial)
    const controls = animate(0, avatarT, { duration: 1.5, ease: [0.33, 0, 0.2, 1], onUpdate: setProgress })
    return () => controls.stop()
  }, [avatarT, reduce])

  const at = (tt: number): Pt => sampler.at(tt)
  const normal = (tt: number): Pt => {
    const a = at(tt - 0.005)
    const b = at(tt + 0.005)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.hypot(dx, dy) || 1
    return { x: -dy / d, y: dx / d }
  }

  // position des fanions : atteints répartis par date derrière l'avatar, prochains devant
  const placed = useMemo(() => {
    const today = now
    const start = new Date(entryDate).getTime()
    const reached = flags.filter((f) => f.reached).sort((a, b) => a.date.localeCompare(b.date))
    const upcoming = flags.filter((f) => !f.reached).sort((a, b) => a.date.localeCompare(b.date))
    const span = (d: string, lo: number, hi: number, from: number, to: number) => {
      const r = to > from ? (new Date(d).getTime() - from) / (to - from) : 0.5
      return lo + Math.min(1, Math.max(0, r)) * (hi - lo)
    }
    const lastDue = upcoming.length ? new Date(upcoming.at(-1)!.date).getTime() : today
    const items = [
      ...reached.map((f) => ({ f, tt: span(f.date, 0.03, avatarT - 0.04, start, today) })),
      ...upcoming.map((f, i) => ({ f, tt: span(f.date, avatarT + 0.05, 0.96, today, lastDue) + (upcoming.length === 1 ? 0 : i * 0.001) })),
    ]
    // écarte un peu les fanions trop proches
    items.sort((a, b) => a.tt - b.tt)
    for (let i = 1; i < items.length; i++) if (items[i].tt - items[i - 1].tt < 0.025) items[i].tt = items[i - 1].tt + 0.025
    // écarte les fanions des panneaux de phase (et de l'avatar) pour éviter tout chevauchement
    const avoid = [...Object.values(STOPS), avatarT]
    for (const it of items) {
      const near = avoid.find((s) => Math.abs(it.tt - s) < 0.04)
      if (near !== undefined) it.tt = near + (it.tt >= near ? 0.04 : -0.04)
    }
    return items.map((it, i) => ({ ...it, side: i % 2 === 0 ? 1 : -1 }))
  }, [flags, entryDate, avatarT, now])

  const returnT = useMemo(() => {
    if (!returnDate) return null
    const start = new Date(entryDate).getTime()
    // le retour est le début du séjour en cours : on le place juste après le départ du dernier séjour
    return Math.max(0.04, Math.min(avatarT - 0.06, 0.05 + ((new Date(returnDate).getTime() - start) / (now - start || 1)) * 0.1))
  }, [returnDate, entryDate, avatarT, now])

  const selectedFlag = placed.find((p) => p.f.id === selected)
  const me = at(progress)

  const onFlagKey = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setSelected((s) => (s === id ? null : id))
    } else if (e.key === "Escape") setSelected(null)
  }

  const pct = (p: Pt) => ({ left: `${(p.x / L.w) * 100}%`, top: `${(p.y / L.h) * 100}%` }) // logical-ok (repère SVG)

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${L.w} ${L.h}`}
        className="block h-auto w-full"
        role="group"
        aria-label={R.label(avatar.name, phase, t.phases.long[phase])}
        onClick={(e) => e.target === e.currentTarget && setSelected(null)}
      >
        <defs>
          <linearGradient id="rr-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--cdis-pop-sky)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--cdis-surface)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="rr-avatar">
            <circle r="22" />
          </clipPath>
        </defs>

        {/* paysage très simple */}
        <rect width={L.w} height={L.h} fill="url(#rr-sky)" />
        <circle cx={L.sun.x} cy={L.sun.y} r="26" fill="var(--cdis-pop-sun)" opacity="0.55" />
        <path d={L.hills[0]} fill="var(--cdis-phase-5-soft)" />
        <path d={L.hills[1]} fill="var(--cdis-phase-5)" opacity="0.18" />
        {L.trees.map(([x, y], i) => (
          <g key={i} aria-hidden>
            <rect x={x - 2} y={y} width="4" height="14" rx="1" fill="var(--cdis-phase-2-ink)" opacity="0.7" />
            <circle cx={x} cy={y - 4} r="11" fill="var(--cdis-phase-5)" opacity="0.55" />
          </g>
        ))}

        {/* la route : à venir en pointillés, parcourue en plein */}
        <path d={L.road} fill="none" stroke="var(--cdis-line)" strokeWidth="26" strokeLinecap="round" />
        <path d={L.road} fill="none" stroke="var(--cdis-line-strong)" strokeWidth="3" strokeDasharray="10 12" strokeLinecap="round" opacity="0.7" />
        <path
          d={L.road}
          pathLength={1}
          fill="none"
          stroke="var(--cdis-ink-muted)"
          strokeOpacity="0.55"
          strokeWidth="26"
          strokeLinecap="round"
          strokeDasharray={`${progress} 1`}
        />
        <path d={L.road} pathLength={1} fill="none" stroke="var(--cdis-surface)" strokeWidth="2.5" strokeDasharray={`${progress} 1`} opacity="0.9" />

        {len > 0 && (
          <>
            {/* détour du retour au centre */}
            {returnT !== null &&
              (() => {
                const a = at(returnT - 0.035)
                const b = at(returnT + 0.035)
                const c = at(returnT)
                const n = normal(returnT)
                const ctrl = { x: c.x + n.x * 90, y: c.y + n.y * 90 }
                const label = { x: c.x + n.x * 78, y: c.y + n.y * 78 }
                return (
                  <g aria-hidden>
                    <path d={`M ${a.x} ${a.y} Q ${ctrl.x} ${ctrl.y} ${b.x} ${b.y}`} fill="none" stroke="var(--cdis-pop-coral)" strokeWidth="6" strokeDasharray="8 8" strokeLinecap="round" />
                    <rect x={label.x - 44} y={label.y - 11} width="88" height="22" rx="11" fill="var(--cdis-surface)" stroke="var(--cdis-pop-coral)" strokeWidth="2" />
                    <text x={label.x} y={label.y + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--cdis-ink)">
                      {R.returned}
                    </text>
                  </g>
                )
              })()}

            {/* départ */}
            {(() => {
              const p = at(0)
              return (
                <g aria-hidden>
                  <circle cx={p.x} cy={p.y} r="9" fill="var(--cdis-teal)" stroke="var(--cdis-surface)" strokeWidth="3" />
                  <text x={wide ? p.x - 8 : p.x + 18} y={wide ? p.y + 34 : p.y - 2} fontSize="12" fontWeight="600" fill="var(--cdis-ink)">
                    {R.start}
                  </text>
                  <text x={wide ? p.x - 8 : p.x + 18} y={wide ? p.y + 49 : p.y + 13} fontSize="11" fill="var(--cdis-ink-muted)">
                    {formatDateLong(entryDate, intlLocale)}
                  </text>
                </g>
              )
            })()}

            {/* arrivée : drapeau + petit bâtiment */}
            {(() => {
              const p = at(1)
              return (
                <g aria-hidden transform={`translate(${p.x} ${p.y})`}>
                  <rect x="-22" y="-44" width="30" height="26" rx="2" fill="var(--cdis-surface)" stroke="var(--cdis-ink)" strokeWidth="2" />
                  <path d="M -26 -44 L -7 -60 L 12 -44 Z" fill="var(--cdis-pop-coral)" />
                  <rect x="-11" y="-30" width="8" height="12" fill="var(--cdis-pop-sky)" />
                  <line x1="18" y1="-18" x2="18" y2="-66" stroke="var(--cdis-ink)" strokeWidth="2.5" />
                  <path d="M 18 -66 L 40 -59 L 18 -51 Z" fill="var(--cdis-pop-sun)" />
                  <text x="0" y="16" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--cdis-ink)">
                    {R.finish}
                  </text>
                </g>
              )
            })()}

            {/* panneaux des 5 phases */}
            {PHASES.map((ph) => {
              const tt = STOPS[ph]
              const p = at(tt)
              const passed = ph <= phase
              // horizontal : phases impaires au-dessus, paires en dessous (jamais de chevauchement) ;
              // vertical : panneau du côté le plus large
              const label = `${ph} · ${t.phases.short[ph]}`
              const w = Math.max(80, label.length * 7.3 + 20)
              const rawX = wide ? p.x : p.x > L.w / 2 ? p.x - w / 2 - 22 : p.x + w / 2 + 22
              const sx = Math.min(L.w - w / 2 - 4, Math.max(w / 2 + 4, rawX)) // toujours dans le dessin
              const sy = wide ? p.y + (ph % 2 ? -54 : 54) : p.y - 30
              const color = PHASE_COLOR_VAR[ph]
              return (
                <g key={ph} aria-hidden>
                  <line x1={p.x} y1={p.y} x2={sx} y2={sy} stroke="var(--cdis-ink-muted)" strokeWidth="2" strokeDasharray={passed ? undefined : "3 4"} />
                  <circle cx={p.x} cy={p.y} r={ph === phase ? 9 : 7} fill={passed ? color : "var(--cdis-surface)"} stroke={passed ? "var(--cdis-surface)" : color} strokeWidth="3" strokeDasharray={passed ? undefined : "3 3"} />
                  <rect
                    x={sx - w / 2}
                    y={sy - 14}
                    width={w}
                    height="28"
                    rx="8"
                    fill={passed ? `var(--cdis-phase-${ph}-soft)` : "var(--cdis-surface)"}
                    stroke={color}
                    strokeWidth={passed ? 2.5 : 2}
                    strokeDasharray={passed ? undefined : "5 4"}
                  />
                  <text x={sx} y={sy + 4.5} textAnchor="middle" fontSize="12" fontWeight="600" fill={passed ? `var(--cdis-phase-${ph}-ink)` : "var(--cdis-ink)"}>
                    {label}
                  </text>
                </g>
              )
            })}

            {/* fanions */}
            {placed.map(({ f, tt, side }) => {
              const p = at(tt)
              const n = normal(tt)
              const d = 24 * side
              const base = { x: p.x + n.x * d, y: p.y + n.y * d }
              const color = PART_COLOR[f.part]
              const isSel = selected === f.id
              const dateTxt = new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit" }).format(new Date(f.date))
              return (
                <g
                  key={f.id}
                  role="button"
                  tabIndex={0}
                  aria-label={R.flagAria(t.roadmap.parts[f.part], f.label, f.reached ? R.reachedOn(dateTxt) : R.dueOn(dateTxt))}
                  aria-expanded={isSel}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelected((s) => (s === f.id ? null : f.id))
                  }}
                  onKeyDown={(e) => onFlagKey(e, f.id)}
                  className="cursor-pointer outline-none [&:focus-visible>circle.ring]:opacity-100"
                  transform={`translate(${base.x} ${base.y})`}
                >
                  <circle className="ring" r="20" cy="-12" fill="none" stroke="var(--cdis-teal)" strokeWidth="2.5" opacity={isSel ? 1 : 0} />
                  <rect x="-14" y="-34" width="28" height="40" fill="transparent" />
                  <line x1="0" y1="4" x2="0" y2="-26" stroke="var(--cdis-ink)" strokeWidth="2" />
                  <path d="M 0 -26 L 15 -21 L 0 -15 Z" fill={f.reached ? color : "var(--cdis-surface)"} stroke={color} strokeWidth="2" strokeLinejoin="round" />
                  {f.reached && (
                    <text y="17" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--cdis-ink-muted)">
                      {dateTxt}
                    </text>
                  )}
                </g>
              )
            })}

            {/* l'avatar, posé sur la route */}
            <g transform={`translate(${me.x} ${me.y - 18})`} aria-hidden>
              <ellipse cx="0" cy="22" rx="18" ry="5" fill="rgb(0 0 0 / 0.15)" />
              <circle r="27" fill={MOOD_COLOR_VAR[avatar.mood]} />
              <circle r="24" fill="var(--cdis-surface)" />
              <image href={avatar.src} x="-22" y="-22" width="44" height="44" clipPath="url(#rr-avatar)" />
            </g>
          </>
        )}
      </svg>

      {/* info-bulle d'un fanion */}
      {selectedFlag &&
        (() => {
          const p = at(selectedFlag.tt)
          const f = selectedFlag.f
          const dateLong = formatDateLong(f.date, intlLocale)
          return (
            <div
              role="dialog"
              aria-label={t.roadmap.parts[f.part]}
              className="absolute z-10 w-60 -translate-x-1/2 rounded-xl border border-line bg-surface p-3 text-sm shadow-raised rtl:translate-x-1/2"
              style={{ ...pct(p), transform: undefined, marginTop: 14 }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: PART_COLOR[f.part] }} />
                  {t.roadmap.parts[f.part]}
                </span>
                <button type="button" onClick={() => setSelected(null)} aria-label={t.common.close} className="-m-1 rounded p-1 text-ink-muted hover:text-ink">
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <p className="mt-1.5 font-medium text-ink">{f.label}</p>
              <p className="mt-1 text-xs text-ink-muted">{f.reached ? R.reachedOn(dateLong) : R.dueOn(dateLong)}</p>
            </div>
          )
        })()}

      {/* légende discrète */}
      <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted" aria-label={R.legend}>
        {(Object.keys(PART_COLOR) as RoadmapPartKey[]).map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
              <line x1="3" y1="15" x2="3" y2="2" stroke="var(--cdis-ink)" strokeWidth="1.5" />
              <path d="M3 2 L14 5.5 L3 9 Z" fill={PART_COLOR[k]} />
            </svg>
            {t.roadmap.parts[k]}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
            <path d="M3 2 L14 5.5 L3 9 Z" fill="none" stroke="var(--cdis-ink-muted)" strokeWidth="1.5" />
          </svg>
          {R.legendUpcoming}
        </li>
      </ul>
    </div>
  )
}
