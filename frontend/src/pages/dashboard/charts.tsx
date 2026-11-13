// Graphiques sobres du tableau de bord (Recharts) : une seule échelle, étiquettes de valeur visibles,
// info-bulles en français, couleurs des tokens, pas de 3D ni de camembert.
import type { ReactNode } from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

export function ChartCard({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card", className)}>
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function FrTooltip({ active, payload, label, format }: { active?: boolean; payload?: { value?: unknown; payload?: { label?: string } }[]; label?: unknown; format: (v: number, label: string) => string }) {
  if (!active || !payload?.length) return null
  const l = String(payload[0].payload?.label ?? label ?? "")
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-raised">
      <p className="font-semibold">{l}</p>
      <p>{format(Number(payload[0].value), l)}</p>
    </div>
  )
}

/** Barres horizontales (une couleur par barre possible), valeur affichée au bout de chaque barre. */
export function HBarChart({
  data,
  format,
  ariaLabel,
}: {
  data: { label: string; value: number; color: string }[]
  format: (v: number, label: string) => string
  ariaLabel: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div style={{ height: data.length * 40 + 8 }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide domain={[0, max]} allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={180} tick={{ fill: "var(--cdis-ink)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "var(--cdis-sand)" }} content={(p) => <FrTooltip {...(p as object)} format={format} />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} minPointSize={2}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
            <LabelList dataKey="value" position="right" fill="var(--cdis-ink)" fontSize={13} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Courbe d'une seule série (humeur moyenne), valeurs étiquetées, échelle 1 → 5. */
export function MoodLine({
  data,
  format,
  ariaLabel,
}: {
  data: { label: string; value: number | null; count: number }[]
  format: (v: number | null, count: number) => string
  ariaLabel: string
}) {
  return (
    <div className="h-56" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--cdis-line)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--cdis-ink-muted)", fontSize: 12 }} axisLine={{ stroke: "var(--cdis-line)" }} tickLine={false} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "var(--cdis-ink-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ stroke: "var(--cdis-line-strong)", strokeDasharray: "4 4" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as { label: string; value: number | null; count: number } | undefined
              return active && p ? (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-raised">
                  <p className="font-semibold first-letter:uppercase">{p.label}</p>
                  <p>{format(p.value, p.count)}</p>
                </div>
              ) : null
            }}
          />
          <Line type="linear" dataKey="value" stroke="var(--cdis-teal)" strokeWidth={2} dot={{ r: 5, fill: "var(--cdis-teal)", stroke: "var(--cdis-surface)", strokeWidth: 2 }} isAnimationActive={false} connectNulls={false}>
            <LabelList dataKey="value" position="top" fill="var(--cdis-ink)" fontSize={12} fontWeight={600} formatter={(v: unknown) => (v === null || v === undefined ? "" : String(v).replace(".", ","))} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
