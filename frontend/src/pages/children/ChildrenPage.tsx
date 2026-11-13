import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import { SearchX, TriangleAlert, Users } from "lucide-react"
import * as api from "@/api"
import { useCurrentUser } from "@/auth/context"
import { EmptyState, PageHeader } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useT } from "@/i18n/context"
import type { ChildSummary } from "@/types"
import { ChildCard, ChildCardSkeleton } from "./ChildCard"
import { ChildrenToolbar } from "./ChildrenToolbar"
import { applyFilters, parsePhase, parseSort, type ChildrenFilters } from "./filters"

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"

/** Mes enfants : les enfants assignés à l'utilisateur connecté (filtrage fait par api/). */
export function ChildrenPage() {
  const t = useT()
  const p = t.pages.children
  const user = useCurrentUser()
  const [children, setChildren] = useState<ChildSummary[] | null>(null)
  const [failed, setFailed] = useState(false)

  // Filtres dans l'URL : ils survivent au retour depuis un dossier.
  const [params, setParams] = useSearchParams()
  const filters: ChildrenFilters = {
    query: params.get("q") ?? "",
    phase: parsePhase(params.get("phase")),
    sort: parseSort(params.get("tri")),
  }

  const updateFilters = (patch: Partial<ChildrenFilters>) => {
    const next = { ...filters, ...patch }
    const sp = new URLSearchParams()
    if (next.query) sp.set("q", next.query)
    if (next.phase) sp.set("phase", String(next.phase))
    if (next.sort !== "priorite") sp.set("tri", next.sort)
    setParams(sp, { replace: true })
  }

  const fetchChildren = useCallback(() => {
    api
      .listChildren()
      .then((list) => {
        setChildren(list)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  const load = () => {
    setFailed(false)
    setChildren(null)
    fetchChildren()
  }

  const visible = children ? applyFilters(children, filters) : []
  const filtering = filters.query !== "" || filters.phase !== null

  return (
    <>
      <PageHeader
        title={p.greeting(user.firstName)}
        description={children ? p.followed(children.length) : <span className="inline-block h-5 w-32 animate-pulse rounded-md bg-muted align-middle" />}
      />

      {failed ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={TriangleAlert}
            title={p.loadError}
            action={
              <Button variant="outline" onClick={load}>
                {p.retry}
              </Button>
            }
          />
        </div>
      ) : children && children.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={Users} title={p.noChildrenTitle} description={p.noChildrenText} />
        </div>
      ) : (
        <>
          <ChildrenToolbar filters={filters} onChange={updateFilters} />

          <p role="status" className="sr-only">
            {children ? p.results(visible.length) : t.app.loading}
          </p>

          {!children ? (
            <div className={GRID} aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <ChildCardSkeleton key={i} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-card border border-line bg-surface shadow-card">
              <EmptyState
                icon={SearchX}
                title={p.noResultTitle}
                description={p.noResultText}
                action={
                  filtering && (
                    <Button variant="outline" onClick={() => updateFilters({ query: "", phase: null })}>
                      {p.clearFilters}
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <ul className={GRID}>
              {visible.map((c) => (
                <li key={c.id}>
                  <ChildCard child={c} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
