import { useEffect, useState } from "react"
import { Lock, UserRound } from "lucide-react"
import * as api from "@/api"
import { useCurrentUser } from "@/auth/context"
import { PageHeader, RoleBadge, SectionCard, UserAvatar } from "@/components/cdis"
import { useI18n } from "@/i18n/context"
import { formatDateLong, fullName } from "@/lib/format"

/** Mon profil — version simple (lecture). L'édition viendra avec les pages métier. */
export function ProfilePage() {
  const { t, intlLocale } = useI18n()
  const user = useCurrentUser()
  const [pole, setPole] = useState("")
  useEffect(() => {
    api.getMyPole().then((p) => setPole(p.name))
  }, [])

  const p = t.pages.profile
  const rows: [string, React.ReactNode][] = [
    [p.birthDate, formatDateLong(user.birthDate, intlLocale)],
    [p.phone, user.phone],
    [p.email, user.email],
  ]
  const locked: [string, React.ReactNode][] = [
    [p.role, <RoleBadge key="r" role={user.role} />],
    [p.pole, pole],
    [p.cin, user.cin],
  ]

  return (
    <>
      <PageHeader
        title={p.title}
        description={p.description}
        leading={<UserAvatar seed={user.avatarSeed} name={fullName(user)} size="lg" />}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title={fullName(user)} icon={UserRound}>
          <dl className="grid gap-4">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-ink-muted">{k}</dt>
                <dd className="mt-0.5 text-base text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
        <SectionCard title={t.common.readOnly} icon={Lock} description={p.lockedHint}>
          <dl className="grid gap-4">
            {locked.map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-ink-muted">{k}</dt>
                <dd className="mt-0.5 text-base text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>
    </>
  )
}
