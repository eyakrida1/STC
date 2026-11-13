import { useCallback, useEffect, useState } from "react"
import { Link, Navigate, useParams } from "react-router"
import { ArrowLeft, Construction, FileQuestion, TriangleAlert } from "lucide-react"
import * as api from "@/api"
import { useCurrentUser } from "@/auth/context"
import { EmptyState, FullPageLoader } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useT } from "@/i18n/context"
import { isProfessional } from "@/lib/access"
import type { AidApplication, AidProgram, Child } from "@/types"
import { ChildHero, type TeamMember } from "./ChildHero"
import { ChildTabs } from "./ChildTabs"
import { resolveTab } from "./tabs"
import { DossierTab } from "./dossier/DossierTab"
import { NotesTab } from "./notes/NotesTab"
import { SpaceTab } from "./space/SpaceTab"

export interface ChildPageData {
  child: Child
  team: TeamMember[]
  aids: AidApplication[]
  programs: AidProgram[]
  unreadNotes: number
}

/** Dossier enfant : en-tête « avatar vivant » + onglets (Dossier, Mon espace, Notes reçues, Roadmap). */
export function ChildPage() {
  const t = useT()
  const p = t.pages.child
  const user = useCurrentUser()
  const { childId = "", tab } = useParams()
  const [data, setData] = useState<ChildPageData | null>(null)
  const [error, setError] = useState<"not_found" | "failed" | null>(null)

  const fetchAll = useCallback(() => {
    Promise.all([
      api.getChild(childId),
      api.getChildTeam(childId),
      api.listAidApplications(childId),
      api.listAidPrograms(),
      isProfessional(user.role) ? api.listReceivedNotes(childId) : Promise.resolve([]),
    ])
      .then(([child, team, aids, programs, notes]) => {
        setData({ child, team, aids, programs, unreadNotes: notes.filter((n) => !n.readAt).length })
        setError(null)
      })
      .catch((e: unknown) => {
        const code = e instanceof api.ApiError ? e.code : null
        setError(code === "not_found" || code === "forbidden" ? "not_found" : "failed")
      })
  }, [childId, user.role])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const setChild = (child: Child) => setData((d) => (d ? { ...d, child } : d))

  const back = (
    <Link
      to="/enfants"
      className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted hover:text-ink"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
      {p.backToList}
    </Link>
  )

  if (error) {
    return (
      <>
        {isProfessional(user.role) && back}
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={error === "not_found" ? FileQuestion : TriangleAlert}
            title={error === "not_found" ? p.notFound : p.loadError}
            action={
              error === "failed" && (
                <Button variant="outline" onClick={fetchAll}>
                  {t.pages.children.retry}
                </Button>
              )
            }
          />
        </div>
      </>
    )
  }

  const activeTab = resolveTab(tab, user.role)
  // onglet inconnu ou non autorisé pour ce rôle : on revient proprement sur « Dossier »
  if (tab !== undefined && tab !== activeTab) return <Navigate to={`/enfants/${childId}`} replace />

  if (!data) return <FullPageLoader />

  const name = `${data.child.identity.firstName} ${data.child.identity.lastName}`

  return (
    <div className="flex flex-col">
      {isProfessional(user.role) && back}
      <ChildHero child={data.child} team={data.team} onChildChange={setChild} />
      <ChildTabs childId={data.child.id} active={activeTab} unreadNotes={data.unreadNotes} />

      <section aria-label={`${name} — ${activeTab === "dossier" ? p.tabs.dossier : activeTab === "roadmap" ? p.tabs.roadmap : activeTab === "notes" ? p.tabs.notes : p.tabs.space[user.role as "educateur"]}`} className="pt-6">
        {activeTab === "dossier" ? (
          <DossierTab data={data} onChildChange={setChild} />
        ) : activeTab === "espace" ? (
          <SpaceTab child={data.child} team={data.team} onChildChange={setChild} />
        ) : activeTab === "notes" ? (
          <NotesTab childId={data.child.id} onUnreadChange={(n) => setData((d) => (d ? { ...d, unreadNotes: n } : d))} />
        ) : (
          <div className="rounded-card border border-line bg-surface shadow-card">
            <EmptyState icon={Construction} title={p.tabs.soonTitle} description={p.tabs.soonText} />
          </div>
        )}
      </section>
    </div>
  )
}
