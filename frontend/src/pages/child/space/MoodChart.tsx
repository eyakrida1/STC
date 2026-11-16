import { useCallback, useEffect, useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Info, LineChart as LineIcon, TriangleAlert } from "lucide-react"
import * as api from "@/api"
import { EmptyState } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/context"
import { addDays, localISODate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { MOOD_SCALE_KEYS, type Child, type MoodScaleKey, type MoodScales, type Session, type SessionResult } from "@/types"
import type { TeamMember } from "../ChildHero"
import { SessionDetailSheet } from "./SessionDetailSheet"
import { SessionSheet } from "./SessionSheet"

/**
 * Palette catégorielle validée (skill dataviz, scripts/validate_palette.js, mode clair) : ordre fixe par échelle,
 * séparation CVD OK. Contraste < 3:1 pour 3 teintes → légende textuelle + vue tableau obligatoires (présentes).
 */
const SERIES: Record<MoodScaleKey, string> = {
  humeur: "#2a78d6",
  anxiete: "#eb6834",
  confiance: "#1baf7a",
  colere: "#eda100",
  relations: "#e87ba4",
  motivation: "#008300",
}

type Point = { sessionId: string; date: string } & MoodScales

/** Psy uniquement : évolution des 6 échelles sur 6 mois ; un point ouvre la consultation. */
export function MoodChart({ child, team, onChildChange }: { child: Child; team: TeamMember[]; onChildChange: (c: Child) => void }) {
  const { t, intlLocale } = useI18n()
  const M = t.followup.mood
  const [points, setPoints] = useState<Point[] | null>(null)
  const [hidden, setHidden] = useState<Set<MoodScaleKey>>(new Set())
  const [detail, setDetail] = useState<Session | null>(null)
  const [editing, setEditing] = useState<Session | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    const since = addDays(localISODate(), -183)
    api
      .listMoodScales(child.id)
      .then((list) => {
        setPoints(list.filter((x) => x.date >= since).map((x) => ({ sessionId: x.sessionId, date: x.date, ...x.scales })))
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [child.id])
  useEffect(() => {
    load()
  }, [load])

  const open = (sessionId: string) => api.getMySession(sessionId).then(setDetail)
  const fmt = (d: string) => new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit" }).format(new Date(`${d}T12:00:00`))
  const toggle = (k: MoodScaleKey) =>
    setHidden((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  return (
    <section aria-labelledby="mood-title" className="flex flex-col gap-4">
      <div>
        <h2 id="mood-title" className="text-xl font-semibold text-ink">
          {M.title}
        </h2>
        <p className="mt-1 inline-flex items-center gap-2 rounded-lg bg-teal-soft px-3 py-2 text-sm text-ink">
          <Info className="size-4 text-teal" aria-hidden />
          {M.shared}
        </p>
      </div>

      {failed ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={TriangleAlert} title={t.pages.child.loadError} action={<Button variant="outline" onClick={load}>{t.pages.children.retry}</Button>} />
        </div>
      ) : points === null ? (
        <div className="h-80 animate-pulse rounded-card border border-line bg-surface" aria-busy="true" />
      ) : points.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={LineIcon} title={M.empty} />
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
          {/* légende cliquable : une rangée de filtres au-dessus du graphique */}
          <ul className="flex flex-wrap gap-2" aria-label={M.legendHint}>
            {MOOD_SCALE_KEYS.map((k) => {
              const on = !hidden.has(k)
              return (
                <li key={k}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={on ? M.hideSeries(t.scales[k]) : M.showSeries(t.scales[k])}
                    onClick={() => toggle(k)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors",
                      on ? "border-line bg-surface text-ink" : "border-dashed border-line bg-transparent text-ink-muted line-through",
                    )}
                  >
                    <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ backgroundColor: on ? SERIES[k] : "var(--cdis-line-strong)" }} />
                    {t.scales[k]}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-ink-muted">
            {M.legendHint} {M.pointHint}
          </p>
          <div className="h-72 w-full" role="img" aria-label={`${M.title}. ${M.table}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid stroke="var(--cdis-line)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill: "var(--cdis-ink-muted)", fontSize: 12 }} axisLine={{ stroke: "var(--cdis-line)" }} tickLine={false} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "var(--cdis-ink-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: "var(--cdis-line-strong)", strokeDasharray: "4 4" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border border-line bg-surface p-3 text-sm shadow-raised">
                        <p className="mb-1 font-semibold text-ink">{fmt(String(label))}</p>
                        {payload.map((p) => (
                          <p key={String(p.dataKey)} className="flex items-center gap-2 text-ink">
                            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                            {t.scales[p.dataKey as MoodScaleKey]} : <strong className="tabular-nums">{String(p.value)}</strong>
                          </p>
                        ))}
                      </div>
                    ) : null
                  }
                />
                {MOOD_SCALE_KEYS.filter((k) => !hidden.has(k)).map((k) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={SERIES[k]}
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={(props: { cx?: number; cy?: number; payload?: Point; index?: number }) => (
                      <circle
                        key={`${k}-${props.index}`}
                        cx={props.cx}
                        cy={props.cy}
                        r={5}
                        fill={SERIES[k]}
                        stroke="var(--cdis-surface)"
                        strokeWidth={2}
                        style={{ cursor: "pointer" }}
                        onClick={() => props.payload && void open(props.payload.sessionId)}
                      />
                    )}
                    activeDot={{ r: 7, stroke: "var(--cdis-surface)", strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* vue tableau : accessible au clavier et aux lecteurs d'écran */}
          <details className="rounded-lg border border-line">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-teal">{M.table}</summary>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-ink-muted">
                    <th scope="col" className="px-3 py-2 text-start font-medium">
                      {M.date}
                    </th>
                    {MOOD_SCALE_KEYS.map((k) => (
                      <th key={k} scope="col" className="px-2 py-2 text-center font-medium">
                        {t.scales[k]}
                      </th>
                    ))}
                    <th scope="col" className="px-2 py-2">
                      <span className="sr-only">{M.open}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.sessionId} className="border-b border-line last:border-0">
                      <th scope="row" className="px-3 py-2 text-start font-medium text-ink">
                        {fmt(p.date)}
                      </th>
                      {MOOD_SCALE_KEYS.map((k) => (
                        <td key={k} className="px-2 py-2 text-center text-ink tabular-nums">
                          {p[k]}
                        </td>
                      ))}
                      <td className="px-2 py-2">
                        <button type="button" onClick={() => void open(p.sessionId)} className="rounded-md text-sm font-medium text-teal hover:underline">
                          {M.open}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <SessionDetailSheet
        session={detail}
        team={team}
        onOpenChange={(o) => !o && setDetail(null)}
        onEdit={(s) => {
          setDetail(null)
          setEditing(s)
        }}
      />
      <SessionSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        child={child}
        team={team}
        session={editing}
        onSaved={(r: SessionResult) => {
          onChildChange(r.child)
          load()
        }}
      />
    </section>
  )
}
