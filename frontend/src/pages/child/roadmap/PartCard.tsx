import type { ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { BookOpen, Brain, ChevronRight, History, Home, Sparkles } from "lucide-react"
import { useCurrentUser } from "@/auth/context"
import { RoleBadge } from "@/components/cdis"
import { useI18n } from "@/i18n/context"
import { ROADMAP_OWNERS, canValidateRoadmapPart } from "@/lib/access"
import { formatDate } from "@/lib/format"
import { MOOD_COLOR_VAR } from "@/lib/tokens"
import { cn } from "@/lib/utils"
import type {
  AidApplication,
  AidProgram,
  Child,
  EducationContent,
  MoodLevel,
  NextStep,
  PsychologicalContent,
  Roadmap,
  RoadmapPartKey,
  SocialContent,
} from "@/types"

const PART_STYLE: Record<RoadmapPartKey, { bar: string; soft: string; icon: typeof BookOpen; color: string }> = {
  education: { bar: "bg-role-educateur", soft: "bg-role-educateur/10", icon: BookOpen, color: "var(--cdis-role-educateur)" },
  psychologique: { bar: "bg-role-psychologue", soft: "bg-role-psychologue/10", icon: Brain, color: "var(--cdis-role-psychologue)" },
  sociale: { bar: "bg-role-social", soft: "bg-role-social/10", icon: Home, color: "var(--cdis-role-social)" },
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{title}</h4>
      <div className="mt-1.5 text-sm text-ink">{children}</div>
    </div>
  )
}

function List({ items, empty }: { items: ReactNode[]; empty: string }) {
  if (!items.length) return <p className="text-ink-muted">{empty}</p>
  return (
    <ul className="flex flex-col gap-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-muted/60" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

function Steps({ steps }: { steps: NextStep[] }) {
  const { t, intlLocale } = useI18n()
  return (
    <List
      empty={t.roadmap.empty}
      items={steps.map((s) => (
        <>
          {s.label} <span className="text-ink-muted">· {t.roadmap.due(formatDate(s.dueDate, intlLocale))}</span>
        </>
      ))}
    />
  )
}

function Gauge({ skill, level, color }: { skill: string; level: number; color: string }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-3" role="img" aria-label={t.roadmap.edu.gaugeValue(skill, level)}>
      <span className="w-32 shrink-0 truncate">{skill}</span>
      <span aria-hidden className="flex flex-1 gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="h-2 flex-1 rounded-full" style={{ backgroundColor: n <= level ? color : "var(--cdis-line)" }} />
        ))}
      </span>
      <span aria-hidden className="w-7 text-end text-xs font-semibold tabular-nums">{level}/5</span>
    </div>
  )
}

/** Mini-courbe de l'humeur générale (6 derniers points). */
function MoodSparkline({ history }: { history: { date: string; level: MoodLevel }[] }) {
  const { t, intlLocale } = useI18n()
  const pts = history.slice(-6)
  if (pts.length < 2) return <p className="text-ink-muted">{t.roadmap.empty}</p>
  const W = 240
  const H = 64
  const x = (i: number) => 10 + (i * (W - 20)) / (pts.length - 1)
  const y = (l: number) => H - 8 - ((l - 1) / 4) * (H - 16)
  const fmt = (d: string) => new Intl.DateTimeFormat(intlLocale, { month: "short" }).format(new Date(d))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full max-w-60" role="img" aria-label={t.roadmap.psy.moodCurveAria(pts.map((p) => `${fmt(p.date)} ${t.moods[p.level].toLowerCase()}`).join(", "))}>
      <polyline points={pts.map((p, i) => `${x(i)},${y(p.level)}`).join(" ")} fill="none" stroke="var(--cdis-role-psychologue)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.level)} r="4.5" fill={MOOD_COLOR_VAR[p.level]} stroke="#fff" strokeWidth="2" />
      ))}
    </svg>
  )
}

export function PartCard({
  part,
  roadmap,
  child,
  aids,
  programs,
  onOpenProposal,
  onOpenHistory,
  justValidated,
}: {
  part: RoadmapPartKey
  roadmap: Roadmap
  child: Child
  aids: AidApplication[]
  programs: AidProgram[]
  onOpenProposal: () => void
  onOpenHistory: () => void
  justValidated: boolean
}) {
  const { t, intlLocale } = useI18n()
  const R = t.roadmap
  const user = useCurrentUser()
  const reduce = useReducedMotion()
  const style = PART_STYLE[part]
  const p = roadmap.parts[part]
  const owner = ROADMAP_OWNERS[part]
  const mine = canValidateRoadmapPart(user.role, part)
  const date = new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit" }).format(new Date(p.validated.validatedAt))
  const Icon = style.icon

  return (
    <motion.section
      aria-labelledby={`part-${part}`}
      className={cn("relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card", justValidated && "ring-2 ring-teal/40")}
      animate={justValidated && !reduce ? { scale: [1, 1.015, 1] } : undefined}
      transition={{ duration: 0.6 }}
    >
      <span aria-hidden className={cn("h-1.5", style.bar)} />
      <header className="flex flex-col gap-2 p-5 pb-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-10 place-items-center rounded-lg", style.soft)} style={{ color: style.color }}>
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 id={`part-${part}`} className="text-lg font-semibold text-ink">
              {R.parts[part]}
            </h3>
            <RoleBadge role={owner} />
          </div>
        </div>
        <span
          className={cn(
            "w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold",
            p.pending ? "bg-mood-2/15 text-ink" : "bg-phase-5-soft text-phase-5-ink",
          )}
        >
          {p.pending ? R.pendingUpdate : R.validatedOn(date)}
        </span>
      </header>

      {p.pending && (
        <button
          type="button"
          onClick={onOpenProposal}
          className="mx-5 mb-3 flex items-center gap-3 rounded-xl border border-zone-ai/40 bg-zone-ai-soft px-3 py-2.5 text-start transition hover:border-zone-ai"
        >
          <Sparkles className="size-5 shrink-0 text-zone-ai-ink" aria-hidden />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-zone-ai-ink">{R.newProposal}</span>
            <span className="block text-xs text-ink">{mine ? R.yourValidation : R.othersValidation(R.theRole[owner])}</span>
          </span>
          <ChevronRight className="size-4 text-zone-ai-ink rtl:rotate-180" aria-hidden />
        </button>
      )}

      {/* tant que la partie n'est pas validée, on affiche la version validée précédente */}
      <div className="flex flex-1 flex-col gap-4 border-t border-line p-5">
        {part === "education" && <EducationBody c={p.validated.content as EducationContent} color={style.color} child={child} />}
        {part === "psychologique" && <PsyBody c={p.validated.content as PsychologicalContent} child={child} />}
        {part === "sociale" && <SocialBody c={p.validated.content as SocialContent} aids={aids} programs={programs} />}
      </div>

      <footer className="border-t border-line px-5 py-3">
        <button type="button" onClick={onOpenHistory} className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-teal hover:underline">
          <History className="size-4" aria-hidden />
          {R.history}
        </button>
      </footer>
    </motion.section>
  )
}

function EducationBody({ c, color, child }: { c: EducationContent; color: string; child: Child }) {
  const female = child.identity.sex === "F"
  const grade = child.schooling.actualGrade
  const { t, intlLocale } = useI18n()
  const E = t.roadmap.edu
  return (
    <>
      <Block title={E.progress}>
        <p className="font-medium">
          {E.levels(c.levelAtEntry, grade ? t.pages.child.grades[grade] : t.pages.child.schooling.toEvaluate)}
        </p>
        <p className="text-xs text-ink-muted">{E.levelLive}</p>
      </Block>
      <Block title={E.milestones}>
        <List empty={t.roadmap.empty} items={c.milestones.map((m) => <>{formatDate(m.date, intlLocale)} · {m.label}</>)} />
      </Block>
      <Block title={female ? E.nowF : E.now}>
        <List empty={t.roadmap.empty} items={c.currentActivities} />
      </Block>
      {c.acquiredSkills.length > 0 && (
        <Block title={E.acquired}>
          <List empty={t.roadmap.empty} items={c.acquiredSkills} />
        </Block>
      )}
      <Block title={E.gauges}>
        <div className="flex flex-col gap-2">
          {c.skillGauges.length ? c.skillGauges.map((g) => <Gauge key={g.skill} skill={g.skill} level={g.level} color={color} />) : <p className="text-ink-muted">{t.roadmap.empty}</p>}
        </div>
      </Block>
      <Block title={E.nextSteps}>
        <Steps steps={c.nextSteps} />
      </Block>
      <Block title={E.tracks}>
        <ol className="flex flex-col gap-2">
          {c.careerTracks.slice(0, 3).map((tr, i) => (
            <li key={tr.title} className="flex gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-role-educateur/15 text-xs font-semibold">{i + 1}</span>
              <span>
                <span className="font-medium">{tr.title}</span>
                <span className="block text-xs text-ink-muted">{tr.reason}</span>
              </span>
            </li>
          ))}
          {!c.careerTracks.length && <li className="text-ink-muted">{t.roadmap.empty}</li>}
        </ol>
      </Block>
    </>
  )
}

function PsyBody({ c, child }: { c: PsychologicalContent; child: Child }) {
  const { t } = useI18n()
  const P = t.roadmap.psy
  return (
    <>
      <Block title={P.profile}>
        <p>{c.profile}</p>
      </Block>
      <Block title={P.character}>
        <ul className="flex flex-wrap gap-1.5">
          {c.character.map((x) => (
            <li key={x} className="rounded-full bg-role-psychologue/10 px-2.5 py-0.5">
              {x}
            </li>
          ))}
        </ul>
      </Block>
      <Block title={P.moodCurve}>
        <MoodSparkline history={child.mood.history} />
      </Block>
      <Block title={P.progress}>
        <List empty={t.roadmap.empty} items={c.progress} />
      </Block>
      <Block title={P.toWork}>
        <List empty={t.roadmap.empty} items={c.toWork} />
      </Block>
      <Block title={P.nextSteps}>
        <Steps steps={c.nextSteps} />
      </Block>
    </>
  )
}

function SocialBody({ c, aids, programs }: { c: SocialContent; aids: AidApplication[]; programs: AidProgram[] }) {
  const { t } = useI18n()
  const S = t.roadmap.soc
  return (
    <>
      <Block title={S.family}>
        <p>{c.familySummary}</p>
      </Block>
      <Block title={S.aids}>
        {/* en direct depuis le suivi des aides (espace de l'intervenant social) */}
        <List
          empty={t.roadmap.empty}
          items={aids
            .filter((a) => a.status !== "refuse")
            .map((a) => `${programs.find((p) => p.id === a.programId)?.label ?? a.programId} : ${t.aids[a.status].toLowerCase()}`)}
        />
        <p className="mt-1 text-xs text-ink-muted">{t.roadmap.live}</p>
      </Block>
      <Block title={S.nextSteps}>
        <Steps steps={c.nextSteps} />
      </Block>
    </>
  )
}
