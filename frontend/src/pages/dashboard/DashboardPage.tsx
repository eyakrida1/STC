import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { ArrowRight, Lock, RotateCcw, Bell, CalendarClock, LogIn, Route, TriangleAlert, Users, UserRoundCheck } from "lucide-react"
import * as api from "@/api"
import { EmptyState, PageHeader, RoleBadge, StatCard, type StatTrend } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/context"
import { PRO_ROLES } from "@/lib/access"
import { formatDate } from "@/lib/format"
import { PHASE_COLOR_VAR } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import { ChartCard, HBarChart, MoodLine } from "./charts"

const PERIODS: api.StatsPeriod[] = ["mois", "trimestre", "annee"]
const ROLE_COLOR = { educateur: "var(--cdis-role-educateur)", psychologue: "var(--cdis-role-psychologue)", social: "var(--cdis-role-social)" } as const

/** Variation d'un indicateur : % pour un nombre, points pour un taux. `higherIsBetter` null = neutre. */
function useTrend() {
  const { t } = useI18n()
  const D = t.pages.dashboard
  return (kpi: api.Kpi, kind: "count" | "rate", higherIsBetter: boolean | null): StatTrend | undefined => {
    if (kpi.value === null || kpi.previous === null) return undefined
    const diff = kpi.value - kpi.previous
    const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat"
    const tone = diff === 0 || higherIsBetter === null ? "neutral" : (diff > 0) === higherIsBetter ? "good" : "bad"
    let text: string
    if (diff === 0) text = D.noChange
    else if (kind === "rate") text = D.pts(diff)
    else if (kpi.previous === 0) text = `${diff > 0 ? "+" : "−"}${Math.abs(diff)}`
    else text = `${diff > 0 ? "+" : "−"}${Math.abs(Math.round((diff / kpi.previous) * 100))} %`
    return { text, direction, tone, label: D.trendLabel(text === D.noChange ? "stable" : text) }
  }
}

/** Tableau de bord du directeur : sobre, lisible en 10 secondes. Toutes les valeurs viennent de api/. */
export function DashboardPage() {
  const { t, intlLocale } = useI18n()
  const D = t.pages.dashboard
  const trend = useTrend()
  const [params, setParams] = useSearchParams()
  const period: api.StatsPeriod = PERIODS.includes(params.get("periode") as api.StatsPeriod) ? (params.get("periode") as api.StatsPeriod) : "mois"
  const [stats, setStats] = useState<api.DashboardStats | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    api
      .getDashboardStats(period)
      .then((s) => {
        setStats(s)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [period])
  useEffect(() => {
    load()
  }, [load])

  const fmt = (d: string) => formatDate(d, intlLocale)
  const monthLabel = (m: string) => new Intl.DateTimeFormat(intlLocale, { month: "short" }).format(new Date(`${m}-15T12:00:00`))

  const periodFilter = (
    <div role="radiogroup" aria-label={D.periodLabel} className="inline-flex rounded-xl bg-muted p-1">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={period === p}
          onClick={() => setParams(p === "mois" ? {} : { periode: p }, { replace: true })}
          className={cn("h-10 rounded-lg px-4 text-sm font-medium transition-colors", period === p ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink")}
        >
          {D.periods[p]}
        </button>
      ))}
    </div>
  )

  if (failed)
    return (
      <>
        <PageHeader title={D.title} actions={periodFilter} />
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={TriangleAlert} title={D.loadError} action={<Button variant="outline" onClick={load}>{t.pages.children.retry}</Button>} />
        </div>
      </>
    )

  if (!stats)
    return (
      <>
        <PageHeader title={D.title} actions={periodFilter} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-card border border-line bg-surface" />
          ))}
        </div>
      </>
    )

  const k = stats.kpis
  const alertsCount = stats.alerts.noSession21Days.length + stats.alerts.roadmapPendingOver7Days.length

  const alerts = (
    <aside aria-labelledby="alerts-title" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-card lg:sticky lg:top-20">
      <h2 id="alerts-title" className="inline-flex items-center gap-2 text-lg font-semibold text-ink">
        <Bell className="size-5 text-mood-2" aria-hidden />
        {D.alerts.title}
        {alertsCount > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-mood-2/15 px-2 text-sm text-ink tabular-nums">{alertsCount}</span>}
      </h2>
      {alertsCount === 0 && <p className="text-sm text-ink-muted">{D.alerts.none}</p>}
      {stats.alerts.noSession21Days.length > 0 && (
        <div>
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            <CalendarClock className="size-4 text-ink-muted" aria-hidden />
            {D.alerts.noSession}
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {stats.alerts.noSession21Days.map((a) => (
              <li key={a.childId}>
                <Link to={`/enfants/${a.childId}`} className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted" title={D.alerts.open}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {a.firstName} {a.lastName}
                    </span>
                    <span className="block text-xs text-ink-muted">{D.alerts.noSessionItem(a.lastSessionDate ? fmt(a.lastSessionDate) : null)}</span>
                  </span>
                  <ArrowRight className="size-4 text-ink-muted group-hover:text-ink rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {stats.alerts.roadmapPendingOver7Days.length > 0 && (
        <div>
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Route className="size-4 text-ink-muted" aria-hidden />
            {D.alerts.roadmap}
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {stats.alerts.roadmapPendingOver7Days.map((a) => (
              <li key={`${a.childId}-${a.part}`}>
                <Link to={`/enfants/${a.childId}/roadmap`} className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted" title={D.alerts.open}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      {a.firstName} {a.lastName}
                    </span>
                    <span className="block text-xs text-ink-muted">{D.alerts.roadmapItem(t.roadmap.parts[a.part], t.roadmap.theRole[a.owner], fmt(a.since))}</span>
                  </span>
                  <ArrowRight className="size-4 text-ink-muted group-hover:text-ink rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )

  return (
    <>
      <PageHeader title={D.titleWithPole(stats.poleName)} description={D.periodRange(fmt(stats.from), fmt(stats.to))} actions={periodFilter} />

      {/* ───────── 4 chiffres clés */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={D.kpis.followed} value={k.childrenFollowed.value ?? "—"} hint={D.kpis.followedHint} icon={Users} trend={trend(k.childrenFollowed, "count", null)} />
        <StatCard
          label={D.kpis.flows}
          value={D.kpis.flowsValue(k.entries.value ?? 0, k.exits.value ?? 0)}
          hint={D.kpis.flowsHint(k.entries.value ?? 0, k.exits.value ?? 0)}
          icon={LogIn}
          trend={trend({ value: (k.entries.value ?? 0) + (k.exits.value ?? 0), previous: (k.entries.previous ?? 0) + (k.exits.previous ?? 0) }, "count", null)}
        />
        <StatCard
          label={D.kpis.insertion}
          value={k.insertionRate.value === null ? "—" : `${k.insertionRate.value} %`}
          hint={k.insertionRate.value === null ? D.kpis.insertionNone : D.kpis.insertionHint}
          icon={UserRoundCheck}
          trend={trend(k.insertionRate, "rate", true)}
        />
        <StatCard label={D.kpis.returned} value={k.returned12m.value ?? "—"} hint={D.kpis.returnedHint} icon={RotateCcw} trend={trend(k.returned12m, "count", false)} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* sur mobile, les alertes viennent juste après les chiffres clés */}
        <div className="lg:col-start-2 lg:row-start-1">{alerts}</div>

        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          {/* ───────── Enfants */}
          <section aria-labelledby="sec-children" className="flex flex-col gap-4">
            <h2 id="sec-children" className="text-xl font-semibold text-ink">
              {D.children.title}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <ChartCard title={D.children.byPhase}>
                <HBarChart
                  ariaLabel={stats.byPhase.map((p) => `${t.phases.short[p.phase]} : ${p.count}`).join(", ")}
                  format={(v) => D.children.children(v)}
                  data={stats.byPhase.map((p) => ({ label: `${p.phase} · ${t.phases.short[p.phase]}`, value: p.count, color: PHASE_COLOR_VAR[p.phase] }))}
                />
              </ChartCard>
              <ChartCard title={D.children.destinations}>
                {stats.exitDestinations.some((d) => d.count) ? (
                  <HBarChart
                    ariaLabel={stats.exitDestinations.map((d) => `${t.exitDestinations[d.destination]} : ${d.count}`).join(", ")}
                    format={(v) => D.children.children(v)}
                    data={stats.exitDestinations.map((d) => ({ label: t.exitDestinations[d.destination], value: d.count, color: "var(--cdis-teal)" }))}
                  />
                ) : (
                  <p className="py-6 text-center text-sm text-ink-muted">{D.children.destinationsEmpty}</p>
                )}
              </ChartCard>
              <StatCard
                label={D.children.averageStay}
                value={stats.averageStayMonths === null ? "—" : D.children.averageStayValue(stats.averageStayMonths)}
                hint={D.children.averageStayHint}
              />
              <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium text-ink-muted">{D.children.attendance}</h3>
                  <span className="text-3xl font-semibold text-ink tabular-nums">{stats.attendance.rate === null ? "—" : `${stats.attendance.rate} %`}</span>
                </div>
                <p className="text-sm text-ink-muted">{D.children.attendanceHint}</p>
                <h4 className="text-sm font-semibold text-ink">{D.children.manyAbsences}</h4>
                {stats.attendance.childrenWithManyAbsences.length ? (
                  <ul className="flex flex-col gap-1">
                    {stats.attendance.childrenWithManyAbsences.map((c) => (
                      <li key={c.childId}>
                        <Link to={`/enfants/${c.childId}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                          <span className="font-medium text-ink">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="rounded-full bg-att-absent-soft px-2 py-0.5 text-xs font-semibold text-att-absent-ink tabular-nums">{D.children.absences(c.absences)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-muted">{D.children.noManyAbsences}</p>
                )}
              </div>
              <ChartCard title={D.children.mood} hint={D.children.moodHint} className="md:col-span-2">
                <MoodLine
                  ariaLabel={stats.moodByMonth.map((m) => `${monthLabel(m.month)} : ${m.average ?? D.children.moodNoData}`).join(", ")}
                  format={(v, n) => D.tooltip.mood(v, n)}
                  data={stats.moodByMonth.map((m) => ({ label: monthLabel(m.month), value: m.average, count: m.count }))}
                />
              </ChartCard>
              <ChartCard title={D.children.aids} className="md:col-span-2">
                <HBarChart
                  ariaLabel={(["depose", "accorde", "refuse"] as const).map((s) => `${D.children.aidsLabels[s]} : ${stats.aids[s]}`).join(", ")}
                  format={(v) => D.tooltip.value(v)}
                  data={[
                    { label: D.children.aidsLabels.depose, value: stats.aids.depose, color: "var(--cdis-phase-1)" },
                    { label: D.children.aidsLabels.accorde, value: stats.aids.accorde, color: "var(--cdis-att-present)" },
                    { label: D.children.aidsLabels.refuse, value: stats.aids.refuse, color: "var(--destructive)" },
                  ]}
                />
              </ChartCard>
            </div>
          </section>

          {/* ───────── Équipe */}
          <section aria-labelledby="sec-team" className="flex flex-col gap-4">
            <div>
              <h2 id="sec-team" className="text-xl font-semibold text-ink">
                {D.team.title}
              </h2>
              <p className="text-sm text-ink-muted">{D.team.hint}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
                <h3 className="text-base font-semibold text-ink">{D.team.byRole}</h3>
                <ul className="flex flex-col gap-2">
                  {PRO_ROLES.map((r) => (
                    <li key={r} className="flex items-center justify-between gap-3">
                      <RoleBadge role={r} size="md" />
                      <span className="text-2xl font-semibold text-ink tabular-nums">{stats.staffByRole[r]}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ChartCard title={D.team.perStaff}>
                <HBarChart
                  ariaLabel={stats.childrenPerStaff.map((s) => `${s.name} : ${s.count}`).join(", ")}
                  format={(v) => D.children.children(v)}
                  data={stats.childrenPerStaff.map((s) => ({ label: s.name, value: s.count, color: ROLE_COLOR[s.role] }))}
                />
              </ChartCard>
              <ChartCard title={D.team.sessions}>
                <HBarChart
                  ariaLabel={PRO_ROLES.map((r) => `${t.roles[r]} : ${stats.sessionsByRole[r]}`).join(", ")}
                  format={(v) => D.tooltip.value(v)}
                  data={PRO_ROLES.map((r) => ({ label: t.roles[r], value: stats.sessionsByRole[r], color: ROLE_COLOR[r] }))}
                />
              </ChartCard>
              <div className="flex flex-col gap-4">
                <StatCard label={D.team.staleNotes} value={stats.staleUnreadNotes} tone={stats.staleUnreadNotes > 0 ? "attention" : "default"} />
                {/* journal des accès aux blocs sensibles : la trace, jamais le contenu */}
                <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-ink-muted">{D.access.card}</h3>
                    <Lock className="size-5 text-ink-muted" aria-hidden />
                  </div>
                  <p className="text-3xl font-semibold text-ink tabular-nums">{stats.sensitiveAccess}</p>
                  <p className="text-sm text-ink-muted">{D.access.cardHint(stats.sensitiveAccess)}</p>
                  <Link to={`/tableau-de-bord/acces?periode=${period}`} className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-teal hover:underline">
                    {D.access.open}
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                  </Link>
                </div>
                <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
                  <h3 className="text-sm font-medium text-ink-muted">{D.team.pending}</h3>
                  <ul className="flex flex-col gap-2">
                    {PRO_ROLES.map((r) => (
                      <li key={r} className="flex items-center justify-between gap-3">
                        <RoleBadge role={r} />
                        <span className="text-lg font-semibold text-ink tabular-nums">{stats.pendingValidationsByRole[r]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
