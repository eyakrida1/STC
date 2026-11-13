import { useCallback, useEffect, useState } from "react"
import { Link, Navigate, useParams } from "react-router"
import { ArrowLeft, FileQuestion, TriangleAlert } from "lucide-react"
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
import { RoadmapTab } from "./roadmap/RoadmapTab"
import { resolveSection } from "./space/sections"
import { SpacePanel } from "./space/SpacePanel"

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
  const { childId = "", tab, section: sectionSlug } = useParams()
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

  // retour : « Mes enfants » pour les intervenants, « Tableau de bord » pour le directeur
  const back = (
    <Link
      to={isProfessional(user.role) ? "/enfants" : "/tableau-de-bord"}
      className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-ink-muted hover:text-ink"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
      {isProfessional(user.role) ? p.backToList : t.pages.dashboard.title}
    </Link>
  )

  if (error) {
    return (
      <>
        {back}
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
  // sous-section de « Mon espace » inconnue ou non autorisée pour ce rôle : retour à la liste des séances
  const section = isProfessional(user.role) ? resolveSection(user.role, sectionSlug) : "seances"
  if (sectionSlug !== undefined && (activeTab !== "espace" || section !== sectionSlug)) {
    return <Navigate to={activeTab === "espace" ? `/enfants/${childId}/espace` : `/enfants/${childId}/${activeTab}`} replace />
  }

  if (!data) return <FullPageLoader />

  const name = `${data.child.identity.firstName} ${data.child.identity.lastName}`

  return (
    <div className="flex flex-col">
      {back}
      <ChildHero child={data.child} team={data.team} onChildChange={setChild} />
      <ChildTabs childId={data.child.id} active={activeTab} unreadNotes={data.unreadNotes} />

      <section aria-label={`${name} — ${activeTab === "dossier" ? p.tabs.dossier : activeTab === "roadmap" ? p.tabs.roadmap : activeTab === "notes" ? p.tabs.notes : p.tabs.space[user.role as "educateur"]}`} className="pt-6">
        {activeTab === "dossier" ? (
          <DossierTab data={data} onChildChange={setChild} />
        ) : activeTab === "espace" ? (
          <SpacePanel
            section={section}
            child={data.child}
            team={data.team}
            aids={data.aids}
            programs={data.programs}
            onChildChange={setChild}
            onAidsChange={(aids) => setData((d) => (d ? { ...d, aids } : d))}
          />
        ) : activeTab === "notes" ? (
          <NotesTab childId={data.child.id} onUnreadChange={(n) => setData((d) => (d ? { ...d, unreadNotes: n } : d))} />
        ) : (
          <RoadmapTab child={data.child} team={data.team} />
        )}
      </section>
    </div>
  )
}
