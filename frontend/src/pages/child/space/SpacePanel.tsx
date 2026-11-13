import { useCurrentUser } from "@/auth/context"
import { SegmentedControl } from "@/components/cdis"
import { useI18n } from "@/i18n/context"
import type { AidApplication, AidProgram, Child, ProfessionalRole } from "@/types"
import type { TeamMember } from "../ChildHero"
import { ActivitiesWeek } from "./ActivitiesWeek"
import { AidsPanel } from "./AidsPanel"
import { AttendanceMonth } from "./AttendanceMonth"
import { MoodChart } from "./MoodChart"
import { SECTION_ICON, SECTIONS_BY_ROLE, sectionLabel, type SpaceSection } from "./sections"
import { SpaceTab } from "./SpaceTab"

/** « Mon espace » : sélecteur secondaire propre au rôle + la sous-section active (dans l'URL). */
export function SpacePanel({
  section,
  child,
  team,
  aids,
  programs,
  onChildChange,
  onAidsChange,
}: {
  section: SpaceSection
  child: Child
  team: TeamMember[]
  aids: AidApplication[]
  programs: AidProgram[]
  onChildChange: (c: Child) => void
  onAidsChange: (a: AidApplication[]) => void
}) {
  const { t } = useI18n()
  const user = useCurrentUser()
  const role = user.role as ProfessionalRole
  const educator = team.find((m) => m.role === "educateur")
  const heldBy = educator ? `${educator.firstName} ${educator.lastName}` : t.roles.educateur
  const base = `/enfants/${child.id}/espace`
  const readOnly = (key: SpaceSection) => SECTIONS_BY_ROLE[role].find((s) => s.key === key)?.readOnly ?? false

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        label={t.followup.sections.label}
        active={section}
        items={SECTIONS_BY_ROLE[role].map(({ key, readOnly: ro }) => ({
          key,
          label: sectionLabel(key, role, t),
          to: key === "seances" ? base : `${base}/${key}`,
          icon: SECTION_ICON[key],
          hint: ro ? t.followup.sections.readOnly : undefined,
        }))}
      />
      {section === "seances" && <SpaceTab child={child} team={team} onChildChange={onChildChange} />}
      {section === "activites" && <ActivitiesWeek key={child.id} childId={child.id} readOnly={readOnly("activites")} heldBy={heldBy} />}
      {section === "presence" && <AttendanceMonth key={child.id} childId={child.id} readOnly={readOnly("presence")} heldBy={heldBy} />}
      {section === "humeur" && <MoodChart child={child} team={team} onChildChange={onChildChange} />}
      {section === "aides" && <AidsPanel childId={child.id} aids={aids} programs={programs} onAidsChange={onAidsChange} />}
    </div>
  )
}
