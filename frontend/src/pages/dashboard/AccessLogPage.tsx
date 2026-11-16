import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { ArrowRight, HeartPulse, Lock, Scale, ShieldCheck, TriangleAlert } from "lucide-react"
import * as api from "@/api"
import { EmptyState, PageHeader, RoleBadge, SelectField } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/context"
import { formatDate } from "@/lib/format"

const PERIODS: api.StatsPeriod[] = ["mois", "trimestre", "annee"]
const ALL = "__all__"

/**
 * Journal des accès aux blocs sensibles (directeur uniquement) : qui a ouvert Santé / Situation judiciaire, et quand.
 * Filtres dans l'URL (?enfant=, ?intervenant=, ?periode=). Chaque ligne mène au dossier en lecture seule.
 */
export function AccessLogPage() {
  const { t, intlLocale } = useI18n()
  const A = t.pages.access
  const [params, setParams] = useSearchParams()
  const childId = params.get("enfant") ?? undefined
  const userId = params.get("intervenant") ?? undefined
  const periodParam = params.get("periode")
  const period = PERIODS.includes(periodParam as api.StatsPeriod) ? (periodParam as api.StatsPeriod) : undefined
  const [log, setLog] = useState<api.AuditLog | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    api
      .listSensitiveAccess({ childId, userId, period })
      .then((l) => {
        setLog(l)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [childId, userId, period])
  useEffect(() => {
    load()
  }, [load])

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === ALL) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }
  const filtering = !!(childId || userId || period)
  const when = (iso: string) => {
    const d = new Date(iso)
    return A.at(formatDate(iso, intlLocale), `${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`)
  }

  return (
    <>
      <PageHeader title={A.title} description={A.description} back={{ to: "/tableau-de-bord", label: A.back }} />

      <section aria-label={A.filters} className="mb-6 grid gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:grid-cols-3">
        <SelectField<string>
          label={A.child}
          value={childId ?? ALL}
          onChange={(v) => setFilter("enfant", v)}
          options={[{ value: ALL, label: A.all }, ...(log?.children ?? []).map((c) => ({ value: c.id, label: c.name }))]}
        />
        <SelectField<string>
          label={A.user}
          value={userId ?? ALL}
          onChange={(v) => setFilter("intervenant", v)}
          options={[{ value: ALL, label: A.all }, ...(log?.users ?? []).map((u) => ({ value: u.id, label: `${u.name} — ${t.roles[u.role]}` }))]}
        />
        <SelectField<string>
          label={A.period}
          value={period ?? ALL}
          onChange={(v) => setFilter("periode", v)}
          options={[{ value: ALL, label: A.allPeriods }, ...PERIODS.map((p) => ({ value: p, label: A.periods[p] }))]}
        />
      </section>

      {failed ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={TriangleAlert} title={A.loadError} action={<Button variant="outline" onClick={load}>{t.pages.children.retry}</Button>} />
        </div>
      ) : !log ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card border border-line bg-surface" />
          ))}
        </div>
      ) : log.entries.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={ShieldCheck}
            title={A.emptyTitle}
            description={A.emptyText}
            action={filtering && <Button variant="outline" onClick={() => setParams({}, { replace: true })}>{A.clear}</Button>}
          />
        </div>
      ) : (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <p role="status" className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm font-medium text-ink">
            <Lock className="size-4 text-ink-muted" aria-hidden />
            {A.count(log.entries.length)}
          </p>
          {/* en-têtes visibles à partir de md ; sur mobile chaque ligne devient une petite carte */}
          <div aria-hidden className="hidden grid-cols-[1.1fr_1.4fr_1.2fr_1fr_auto] gap-4 border-b border-line px-5 py-2 text-xs font-semibold tracking-wide text-ink-muted uppercase md:grid">
            <span>{A.when}</span>
            <span>{A.who}</span>
            <span>{A.which}</span>
            <span>{A.block}</span>
            <span className="w-5" />
          </div>
          <ul>
            {log.entries.map((e) => {
              const Icon = e.block === "health" ? HeartPulse : Scale
              return (
                <li key={e.id} className="border-b border-line last:border-0">
                  <Link
                    to={`/enfants/${e.childId}`}
                    aria-label={`${when(e.at)} — ${e.userName} (${t.roles[e.userRole]}) — ${e.childName} — ${A.blocks[e.block]}. ${A.openFile(e.childName)}`}
                    className="group grid gap-1 px-5 py-3 hover:bg-sand md:grid-cols-[1.1fr_1.4fr_1.2fr_1fr_auto] md:items-center md:gap-4"
                  >
                    <span className="text-sm text-ink tabular-nums">{when(e.at)}</span>
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                      {e.userName}
                      <RoleBadge role={e.userRole} />
                    </span>
                    <span className="text-sm font-medium text-ink">{e.childName}</span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-ink">
                      <Icon className="size-4 text-ink-muted" aria-hidden />
                      {A.blocks[e.block]}
                    </span>
                    <ArrowRight className="hidden size-4 text-ink-muted group-hover:text-ink md:block rtl:rotate-180" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">{A.retention}</p>
        </div>
      )}
    </>
  )
}
