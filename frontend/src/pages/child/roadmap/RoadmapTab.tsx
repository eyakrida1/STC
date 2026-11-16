import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Eye, Flag, Loader2, Sparkles, TriangleAlert, Wand2 } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { useCurrentUser } from "@/auth/context"
import { EmptyState, RoadmapRoad, type RoadFlag } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/context"
import { canRequestRoadmapUpdate } from "@/lib/access"
import { childPortraitSrc } from "@/lib/avatar"
import { emitDataChanged } from "@/lib/events"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ROADMAP_PART_KEYS, type AidApplication, type AidProgram, type AiNoteStatus, type Child, type EducationContent, type Roadmap, type RoadmapPartKey, type RoadmapSource } from "@/types"
import type { TeamMember } from "../ChildHero"
import { Celebration } from "./Celebration"
import { HistorySheet } from "./HistorySheet"
import { PartCard } from "./PartCard"
import { ProposalSheet } from "./ProposalSheet"

/** Anneau de progression (zone pop : roadmap). */
function ProgressRing({ value, label }: { value: number; label: string }) {
  const reduce = useReducedMotion()
  const r = 30
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid size-20 shrink-0 place-items-center" role="img" aria-label={label}>
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--cdis-line)" strokeWidth="7" />
        <motion.circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--cdis-pop-coral)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - value / 100) : c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: reduce ? 0 : 1.2, ease: "easeOut" }}
        />
      </svg>
      <span aria-hidden className="text-lg font-bold text-ink tabular-nums">
        {value}%
      </span>
    </div>
  )
}

/** Jalons de la route : atteints (jalons éducation datés, versions validées) et prochains pas des 3 parties. */
function buildFlags(roadmap: Roadmap, t: ReturnType<typeof useI18n>["t"]): RoadFlag[] {
  const flags: RoadFlag[] = []
  const edu = roadmap.parts.education.validated.content as EducationContent
  edu.milestones.forEach((m, i) => flags.push({ id: `m-${i}`, part: "education", label: m.label, date: m.date, reached: true }))
  ROADMAP_PART_KEYS.forEach((k) => {
    roadmap.parts[k].history
      .filter((v) => v.decision !== "initiale")
      .forEach((v) =>
        flags.push({ id: `v-${k}-${v.version}`, part: k, label: t.roadmap.road.milestoneValidated(t.roadmap.parts[k]), date: v.validatedAt.slice(0, 10), reached: true }),
      )
    roadmap.parts[k].validated.content.nextSteps.forEach((s, i) =>
      flags.push({ id: `n-${k}-${i}-${s.label}`, part: k, label: s.label, date: s.dueDate, reached: false }),
    )
  })
  return flags
}

export function RoadmapTab({
  child,
  team,
  aids,
  programs,
}: {
  child: Child
  team: TeamMember[]
  aids: AidApplication[]
  programs: AidProgram[]
}) {
  const { t, intlLocale } = useI18n()
  const R = t.roadmap
  const user = useCurrentUser()
  const reduce = useReducedMotion()
  const canUpdate = canRequestRoadmapUpdate(user.role)

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [sources, setSources] = useState<RoadmapSource[]>([])
  const [ai, setAi] = useState<AiNoteStatus | null>(null)
  const [failed, setFailed] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [proposalPart, setProposalPart] = useState<RoadmapPartKey | null>(null)
  const [historyPart, setHistoryPart] = useState<RoadmapPartKey | null>(null)
  const [burst, setBurst] = useState(0)
  const [justValidated, setJustValidated] = useState<RoadmapPartKey | null>(null)

  const load = useCallback(() => {
    Promise.all([
      api.getRoadmap(child.id),
      api.getRoadmapSources(child.id),
      canUpdate ? api.getAiNoteStatus(child.id) : Promise.resolve(null),
    ])
      .then(([r, s, a]) => {
        setRoadmap(r)
        setSources(s)
        setAi(a)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [child.id, canUpdate])

  useEffect(() => {
    load()
  }, [load])

  const generate = async () => {
    setGenerating(true)
    try {
      const { roadmap: r, proposedParts } = await api.generateRoadmapProposal(child.id)
      setRoadmap(r)
      toast[proposedParts.length ? "success" : "info"](R.generated(proposedParts.length))
      emitDataChanged("notifications")
      const [s, a] = await Promise.all([api.getRoadmapSources(child.id), api.getAiNoteStatus(child.id)])
      setSources(s)
      setAi(a)
    } catch {
      toast.error(R.generateError)
    } finally {
      setGenerating(false)
    }
  }

  const onDone = (r: Roadmap, validated: RoadmapPartKey | null) => {
    setRoadmap(r)
    emitDataChanged("notifications")
    if (validated) {
      setBurst((b) => b + 1)
      setJustValidated(validated)
      window.setTimeout(() => setJustValidated(null), 1400)
    }
  }

  if (failed)
    return (
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState icon={TriangleAlert} title={t.pages.child.loadError} action={<Button variant="outline" onClick={load}>{t.pages.children.retry}</Button>} />
      </div>
    )
  if (!roadmap)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="h-32 animate-pulse rounded-card border border-line bg-surface" />
        <div className="h-72 animate-pulse rounded-card border border-line bg-surface" />
      </div>
    )

  const lastValidated = ROADMAP_PART_KEYS.map((k) => roadmap.parts[k].validated.validatedAt).sort().at(-1)!
  const stays = child.journey.stays
  const flags = buildFlags(roadmap, t)

  return (
    <div className="relative flex flex-col gap-6">
      <Celebration burstKey={burst} />

      {/* ───────── Bandeau */}
      <section aria-labelledby="rm-objective" className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:p-6">
        <ProgressRing value={roadmap.progressPercent} label={R.progress(roadmap.progressPercent)} />
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            <Flag className="size-3.5" aria-hidden />
            {R.objective}
          </p>
          <h2 id="rm-objective" className="mt-1 text-xl font-semibold text-ink sm:text-2xl">
            {roadmap.objective}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {R.careerTrack} : <span className="font-medium text-ink">{roadmap.careerTrack}</span>
            <span aria-hidden> · </span>
            <span className="block sm:inline">{R.lastValidated(formatDate(lastValidated, intlLocale))}</span>
          </p>
        </div>
        {canUpdate ? (
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button size="lg" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Wand2 data-icon="inline-start" aria-hidden />}
              {R.update}
            </Button>
            {ai && (
              <div className="flex flex-col gap-1 sm:items-end">
                <span className="text-xs font-medium text-zone-ai-ink tabular-nums">{R.aiCounter(Math.min(ai.pending, ai.threshold), ai.threshold)}</span>
                <span aria-hidden className="flex gap-1">
                  {Array.from({ length: ai.threshold }, (_, i) => (
                    <span key={i} className={cn("h-1.5 w-6 rounded-full", i < ai.pending ? "bg-zone-ai" : "bg-zone-ai/20")} />
                  ))}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Eye className="size-4" aria-hidden />
            {R.readOnly}
          </p>
        )}
      </section>

      {/* ───────── L'IA rédige */}
      <AnimatePresence>
        {generating && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-4 rounded-card border border-zone-ai/40 bg-zone-ai-soft p-4"
          >
            <span className="relative grid size-10 place-items-center">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute"
                  style={{ top: i === 0 ? 0 : undefined, bottom: i === 2 ? 0 : undefined }}
                  animate={reduce ? undefined : { scale: [0.6, 1.1, 0.6], opacity: [0.3, 1, 0.3], rotate: [0, 45, 90] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                >
                  <Sparkles className={cn("text-zone-ai", i === 1 ? "size-6" : "size-3.5")} aria-hidden />
                </motion.span>
              ))}
            </span>
            <span>
              <span className="block font-semibold text-zone-ai-ink">{R.generating}</span>
              <span className="block text-sm text-ink">{R.generatingHint}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───────── La route */}
      <section aria-label={t.pages.child.tabs.roadmap} className="overflow-hidden rounded-card border border-line bg-surface p-3 shadow-card sm:p-5">
        <RoadmapRoad
          key={child.journey.phase}
          phase={child.journey.phase}
          entryDate={stays[0].entryDate}
          returnDate={stays.length > 1 ? stays.at(-1)!.entryDate : null}
          avatar={{ src: childPortraitSrc(child.identity, child.mood.level), name: child.identity.firstName, mood: child.mood.level }}
          flags={flags}
        />
      </section>

      {/* ───────── Les 3 parties */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {ROADMAP_PART_KEYS.map((k) => (
          <PartCard
            key={k}
            part={k}
            roadmap={roadmap}
            child={child}
            aids={aids}
            programs={programs}
            justValidated={justValidated === k}
            onOpenProposal={() => setProposalPart(k)}
            onOpenHistory={() => setHistoryPart(k)}
          />
        ))}
      </div>

      <ProposalSheet part={proposalPart} roadmap={roadmap} sources={sources} team={team} onOpenChange={(o) => !o && setProposalPart(null)} onDone={onDone} />
      <HistorySheet part={historyPart} roadmap={roadmap} team={team} onOpenChange={(o) => !o && setHistoryPart(null)} />
    </div>
  )
}
