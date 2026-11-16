import { CalendarDays, Eye, RotateCcw } from "lucide-react"
import { useCurrentUser } from "@/auth/context"
import { AvatarLive, MoodBadge, PhaseBadge, PhaseTrack, RoleBadge, UserAvatar } from "@/components/cdis"
import { useI18n } from "@/i18n/context"
import { canEditPhase } from "@/lib/access"
import { childPortraitSrc } from "@/lib/avatar"
import { buildBubbles } from "@/lib/bubbles"
import { ageFrom, formatDateLong } from "@/lib/format"
import type { Child, ProfessionalRole } from "@/types"
import { PhaseChangeDialog } from "./PhaseChangeDialog"

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  role: ProfessionalRole
  avatarSeed: string
  photoUrl?: string | null
}

const pill = "inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 text-sm font-medium text-ink"

/** En-tête du dossier : avatar vivant (zone pop) à gauche, identité et parcours à droite. */
export function ChildHero({
  child,
  team,
  onChildChange,
}: {
  child: Child
  team: TeamMember[]
  onChildChange: (c: Child) => void
}) {
  const { t, intlLocale } = useI18n()
  const p = t.pages.child
  const user = useCurrentUser()
  const { identity, journey, mood } = child
  const name = `${identity.firstName} ${identity.lastName}`
  const moodDate = new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit" }).format(new Date(mood.updatedAt))

  return (
    <section
      aria-label={name}
      className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
    >
      <div className="grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-[500px_1fr] lg:gap-8">
        <AvatarLive
          src={childPortraitSrc({ ...identity, sex: identity.sex }, mood.level)}
          name={identity.firstName}
          mood={mood.level}
          bubbles={buildBubbles(child.interests)}
          footer={<MoodBadge level={mood.level} size="md" withPrefix detail={p.moodShared(moodDate)} />}
        />

        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{name}</h1>
            <p className="mt-1 text-lg text-ink-muted">
              {p.age(ageFrom(identity.birthDate))}
              <span aria-hidden> · </span>
              <span className="sr-only">, </span>
              {child.code}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PhaseBadge phase={journey.phase} variant="long" size="md" />
            <PhaseTrack phase={journey.phase} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={pill}>{t.childStatus[journey.status]}</span>
            <span className={pill}>
              <CalendarDays className="size-4 text-ink-muted" aria-hidden />
              {p.enteredOn(formatDateLong(journey.entryDate, intlLocale))}
            </span>
            {journey.stays.length > 1 && (
              <span className={pill}>
                <RotateCcw className="size-4 text-ink-muted" aria-hidden />
                {t.returned}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-sm font-medium text-ink-muted">{identity.sex === "F" ? p.teamFemale : p.team}</h2>
            <ul className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
              {team.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <UserAvatar seed={m.avatarSeed} photoUrl={m.photoUrl} name="" size="sm" />
                  <span className="text-sm font-medium text-ink">
                    {m.firstName} {m.lastName}
                  </span>
                  <RoleBadge role={m.role} />
                </li>
              ))}
            </ul>
          </div>

          {canEditPhase(user.role) ? (
            <div>
              <PhaseChangeDialog child={child} onChanged={onChildChange} />
            </div>
          ) : (
            <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
              <Eye className="size-4" aria-hidden />
              {p.readOnlyNotice}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
