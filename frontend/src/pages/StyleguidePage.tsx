import { useEffect, useState, type ReactNode } from "react"
import * as api from "@/api"
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarCheck,
  Inbox,
  Map,
  NotebookPen,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
  HeartPulse,
} from "lucide-react"
import {
  AvatarLive,
  CheckboxField,
  ChildAvatar,
  EmptyState,
  FullPageLoader,
  MoodBadge,
  NoteCard,
  PageHeader,
  PhaseBadge,
  PhaseTrack,
  RoadmapRoad,
  RoleBadge,
  SegmentedControl,
  SelectField,
  TagsField,
  TextField,
  SectionCard,
  StatCard,
  UnreadDivider,
  UserAvatar,
} from "@/components/cdis"
import { Logo } from "@/components/shell/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/i18n/context"
import { childAvatarUri } from "@/lib/avatar"
import { buildBubbles } from "@/lib/bubbles"
import { MOOD_LEVELS, PHASES, type MoodLevel, type Role } from "@/types"

const ROLES: Role[] = ["educateur", "psychologue", "social", "directeur"]
const ROLE_HEX: Record<Role, string> = {
  educateur: "#D97706",
  psychologue: "#7C3AED",
  social: "#2563EB",
  directeur: "#0F766E",
}
const MOOD_HEX: Record<MoodLevel, string> = { 1: "#EF4444", 2: "#F97316", 3: "#A3A3A3", 4: "#22C55E", 5: "#10B981" }
const PHASE_HEX = {
  1: ["#6B8BC0", "#E8EEF7", "#2F4D7A"],
  2: ["#D9A03A", "#FBF0D9", "#7A4F00"],
  3: ["#9B7FD4", "#EFE9F9", "#563A99"],
  4: ["#3FA7B5", "#E0F2F4", "#0E5F6B"],
  5: ["#5BAE6B", "#E3F3E6", "#2C6637"],
} as const

function Block({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <h2 id={id} className="text-lg font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-ink-muted">{title}</h3>
      {children}
    </div>
  )
}

/** Échantillon : la couleur est lue depuis la variable CSS (et non une classe dynamique, que Tailwind ne détecterait pas). */
function Swatch({ name, hex, token, cssVar }: { name: string; hex: string; token: string; cssVar: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="h-16 border-b border-line" style={{ backgroundColor: `var(${cssVar})` }} />
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-ink">{name}</p>
        <p className="font-mono text-xs text-ink-muted">{hex}</p>
        <p className="font-mono text-xs text-ink-muted">{token}</p>
      </div>
    </div>
  )
}

function FormSample() {
  const { t } = useI18n()
  const f = t.styleguide.formSample
  const [name, setName] = useState("")
  const [grade, setGrade] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>(["Football"])
  const [ok, setOk] = useState(true)
  return (
    <>
      <TextField label={f.text} value={name} onChange={setName} error={name ? null : t.pages.child.cards.required} />
      <SelectField<string> label={f.select} value={grade} onChange={setGrade} options={f.options.map((o) => ({ value: o, label: o }))} />
      <TagsField label={f.tags} values={tags} onChange={setTags} />
      <CheckboxField label={f.checkbox} checked={ok} onChange={setOk} />
    </>
  )
}

const grid = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"

export function StyleguidePage() {
  const { t, dir, setDir } = useI18n()
  const s = t.styleguide
  const sec = s.sections
  // exemples (noms, textes, dates) : lus dans mocks/donnees.ts via l'API, jamais écrits dans la page
  const [ex, setEx] = useState<api.StyleguideExamples | null>(null)
  useEffect(() => {
    api.getStyleguideExamples().then(setEx)
  }, [])
  if (!ex) return <FullPageLoader />

  return (
    <div className="min-h-dvh bg-sand">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-page items-center gap-3 px-4 sm:px-6">
          <Logo />
          <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
          <span className="hidden text-sm font-medium text-ink-muted sm:block">{s.title}</span>
          <div className="ms-auto flex items-center gap-2" role="group" aria-label={s.direction}>
            <Button variant={dir === "ltr" ? "default" : "outline"} size="sm" onClick={() => setDir("ltr")} aria-pressed={dir === "ltr"}>
              {s.ltr}
            </Button>
            <Button variant={dir === "rtl" ? "default" : "outline"} size="sm" onClick={() => setDir("rtl")} aria-pressed={dir === "rtl"}>
              {s.rtl}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-page flex-col gap-14 px-4 py-10 sm:px-6">
        <PageHeader title={s.title} description={s.description} className="mb-0" />

        {/* ───────── Couleurs */}
        <Block title={sec.colors} id="sg-colors">
          <Sub title={sec.base}>
            <div className={grid}>
              <Swatch name={s.tokenNames.sand} hex="#FAF7F2" token="bg-sand" cssVar="--cdis-sand" />
              <Swatch name={s.tokenNames.surface} hex="#FFFFFF" token="bg-surface" cssVar="--cdis-surface" />
              <Swatch name={s.tokenNames.line} hex="#ECE6DC" token="border-line" cssVar="--cdis-line" />
              <Swatch name={s.tokenNames.ink} hex="#1F2A37" token="text-ink" cssVar="--cdis-ink" />
              <Swatch name={s.tokenNames.inkMuted} hex="#6B7280" token="text-ink-muted" cssVar="--cdis-ink-muted" />
            </div>
          </Sub>
          <Sub title={sec.primary}>
            <div className={grid}>
              <Swatch name={s.tokenNames.teal} hex="#0F766E" token="bg-teal / bg-primary" cssVar="--cdis-teal" />
              <Swatch name={s.tokenNames.tealSoft} hex="#E6F2F1" token="bg-teal-soft" cssVar="--cdis-teal-soft" />
            </div>
          </Sub>
          <Sub title={sec.pop}>
            <div className={grid}>
              <Swatch name={s.tokenNames.coral} hex="#F97360" token="bg-pop-coral" cssVar="--cdis-pop-coral" />
              <Swatch name={s.tokenNames.sun} hex="#F5B700" token="bg-pop-sun" cssVar="--cdis-pop-sun" />
              <Swatch name={s.tokenNames.sky} hex="#38BDF8" token="bg-pop-sky" cssVar="--cdis-pop-sky" />
            </div>
          </Sub>
          <Sub title={sec.roles}>
            <div className={grid}>
              {ROLES.map((r) => (
                <Swatch key={r} name={t.roles[r]} hex={ROLE_HEX[r]} token={`bg-role-${r}`} cssVar={`--cdis-role-${r}`} />
              ))}
            </div>
          </Sub>
          <Sub title={sec.moods}>
            <div className={grid}>
              {MOOD_LEVELS.map((m) => (
                <Swatch key={m} name={`${m} · ${t.moods[m]}`} hex={MOOD_HEX[m]} token={`bg-mood-${m}`} cssVar={`--cdis-mood-${m}`} />
              ))}
            </div>
          </Sub>
          <Sub title={sec.phases}>
            <div className={grid}>
              {PHASES.map((p) => (
                <div key={p} className="overflow-hidden rounded-xl border border-line bg-surface">
                  <div className="flex h-16">
                    {["", "-soft", "-ink"].map((v) => (
                      <div key={v} className="flex-1" style={{ backgroundColor: `var(--cdis-phase-${p}${v})` }} />
                    ))}
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-ink">
                      {p} · {t.phases.long[p]}
                    </p>
                    <p className="font-mono text-xs text-ink-muted">{PHASE_HEX[p].join(" · ")}</p>
                    <p className="font-mono text-xs text-ink-muted">phase-{p} / -soft / -ink</p>
                  </div>
                </div>
              ))}
            </div>
          </Sub>
        </Block>

        {/* ───────── Typographie */}
        <Block title={sec.typography} id="sg-type">
          <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 shadow-card">
            <p className="text-3xl font-semibold tracking-tight text-ink">{s.typeSamples.display}</p>
            <p className="text-2xl font-semibold text-ink">{s.typeSamples.h1}</p>
            <p className="text-lg font-semibold text-ink">{s.typeSamples.h2}</p>
            <p className="max-w-prose text-base text-ink">{s.typeSamples.body}</p>
            <p className="text-sm text-ink-muted">{s.typeSamples.small}</p>
            <p className="text-xs text-ink-muted">{s.typeSamples.caption}</p>
            <p lang="ar" dir="rtl" className="text-2xl font-medium text-ink">
              {s.typeSamples.arabic}
            </p>
            <p className="font-mono text-xs text-ink-muted">Rubik 400 · 500 · 600 · 700 — latin + arabe</p>
          </div>
        </Block>

        {/* ───────── Forme */}
        <Block title={sec.shape} id="sg-shape">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid h-24 place-items-center rounded-lg border border-line bg-surface text-sm text-ink-muted">
              {s.radiusControl}
            </div>
            <div className="grid h-24 place-items-center rounded-card border border-line bg-surface text-sm text-ink-muted">
              {s.radiusCard}
            </div>
            <div className="grid h-24 place-items-center rounded-card bg-surface text-sm text-ink-muted shadow-card">
              {s.shadowCard}
            </div>
            <div className="grid h-24 place-items-center rounded-card bg-surface text-sm text-ink-muted shadow-raised">
              {s.shadowRaised}
            </div>
          </div>
          <p className="text-sm text-ink-muted">{s.focusHint}</p>
        </Block>

        {/* ───────── Contrôles */}
        <Block title={sec.controls} id="sg-controls">
          <div className="flex flex-col gap-6 rounded-card border border-line bg-surface p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <Button>
                <NotebookPen data-icon="inline-start" aria-hidden />
                {s.buttons.primary}
              </Button>
              <Button variant="secondary">{s.buttons.secondary}</Button>
              <Button variant="outline">{s.buttons.outline}</Button>
              <Button variant="ghost">{s.buttons.ghost}</Button>
              <Button variant="destructive">{s.buttons.destructive}</Button>
              <Button disabled>{s.buttons.disabled}</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">{s.buttons.primary}</Button>
              <Button size="sm" variant="outline">
                {s.buttons.outline}
              </Button>
              <Button size="icon" variant="outline" aria-label={t.notifications.title}>
                <Bell aria-hidden />
              </Button>
            </div>
            <div className="flex max-w-sm flex-col gap-2">
              <Label htmlFor="sg-field">{s.field.label}</Label>
              <Input id="sg-field" placeholder={s.field.placeholder} aria-describedby="sg-field-hint" />
              <p id="sg-field-hint" className="text-sm text-ink-muted">
                {s.field.hint}
              </p>
            </div>
          </div>
        </Block>

        {/* ───────── Badges */}
        <Block title={sec.badges} id="sg-badges">
          <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 shadow-card">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <RoleBadge key={r} role={r} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <RoleBadge key={r} role={r} size="md" plain />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {PHASES.map((p) => (
                <PhaseBadge key={p} phase={p} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {PHASES.map((p) => (
                <PhaseBadge key={p} phase={p} variant="long" size="md" />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {PHASES.map((p) => (
                <PhaseTrack key={p} phase={p} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MoodBadge level={4} size="md" withPrefix detail={s.moodDetail} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {MOOD_LEVELS.map((m) => (
                <MoodBadge key={m} level={m} />
              ))}
              <span className="mx-2 h-5 w-px bg-line" aria-hidden />
              {MOOD_LEVELS.map((m) => (
                <MoodBadge key={m} level={m} showLabel={false} />
              ))}
            </div>
          </div>
        </Block>

        {/* ───────── PageHeader / SectionCard */}
        <Block title={sec.cards} id="sg-cards">
          <div className="rounded-card border border-dashed border-line p-6">
            <PageHeader
              title={ex.enTete.title}
              description={ex.enTete.description}
              back={{ to: "/styleguide", label: t.common.back }}
              leading={<ChildAvatar seed={ex.enfant.seed} name={ex.enfant.name} sex={ex.enfant.sex} mood={3} size="md" />}
              actions={
                <Button>
                  <NotebookPen data-icon="inline-start" aria-hidden />
                  {s.pageHeaderSample.action}
                </Button>
              }
              className="mb-0"
            />
          </div>
          <div className="grid items-start gap-6 md:grid-cols-2">
            <SectionCard
              title={s.sampleSection.title}
              description={s.sampleSection.description}
              icon={BookOpen}
              editors={["educateur"]}
              actions={
                <Button variant="ghost" size="sm">
                  {t.common.edit}
                </Button>
              }
            >
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm text-ink-muted">{s.sampleSection.lastSchool}</dt>
                  <dd className="text-base text-ink">{ex.carteScolarite.lastSchool}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-muted">{s.sampleSection.nominal}</dt>
                  <dd className="text-base text-ink">{ex.carteScolarite.nominal}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-muted">{s.sampleSection.actual}</dt>
                  <dd className="text-base text-ink">{ex.carteScolarite.actual}</dd>
                </div>
              </dl>
            </SectionCard>
            <SectionCard
              title={s.sampleSection.collapsibleTitle}
              icon={HeartPulse}
              collapsible
              sensitive
              editors={["social", "psychologue"]}
            >
              <p className="text-base text-ink">{ex.carteScolarite.health}</p>
            </SectionCard>
          </div>
        </Block>

        {/* ───────── StatCard */}
        <Block title={sec.stats} id="sg-stats">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={s.stats.followed} value={ex.chiffres.followed} hint={s.stats.followedHint} icon={Users} trend={{ text: ex.chiffres.followedTrend, direction: "up", tone: "neutral", label: t.pages.dashboard.trendLabel(ex.chiffres.followedTrend) }} />
            <StatCard label={s.stats.insertion} value={ex.chiffres.insertion} hint={s.stats.insertionHint} icon={Route} trend={{ text: t.pages.dashboard.pts(ex.chiffres.insertionTrendPts), direction: "down", tone: "bad", label: t.pages.dashboard.trendLabel(t.pages.dashboard.pts(ex.chiffres.insertionTrendPts)) }} />
            <StatCard label={s.stats.returned} value={ex.chiffres.returned} hint={s.stats.returnedHint} icon={CalendarCheck} />
            <StatCard label={s.stats.pending} value={ex.chiffres.pending} hint={s.stats.pendingHint} icon={AlertTriangle} tone="attention" />
          </div>
        </Block>

        {/* ───────── EmptyState */}
        <Block title={sec.empty} id="sg-empty">
          <div className="rounded-card border border-line bg-surface shadow-card">
            <EmptyState
              icon={Inbox}
              title={s.emptySample.title}
              description={s.emptySample.text}
              action={<Button variant="outline">{s.emptySample.action}</Button>}
            />
          </div>
        </Block>

        {/* ───────── Notes */}
        <Block title={sec.notes} id="sg-notes">
          <div className="flex max-w-2xl flex-col gap-3">
            <UnreadDivider label={t.notes.unread} count={1} tone="new" />
            <NoteCard
              authorName={ex.notes[0].author}
              authorRole={ex.notes[0].role}
              authorAvatarSeed={ex.notes[0].authorSeed}
              sharedAt={ex.notes[0].sharedAt}
              sessionLabel={ex.notes[0].session}
              text={ex.notes[0].text}
              unread
              onOpen={() => undefined}
            />
            <UnreadDivider label={t.notes.read} />
            <NoteCard
              authorName={ex.notes[1].author}
              authorRole={ex.notes[1].role}
              authorAvatarSeed={ex.notes[1].authorSeed}
              sharedAt={ex.notes[1].sharedAt}
              sessionLabel={ex.notes[1].session}
              text={ex.notes[1].text}
            />
          </div>
        </Block>

        {/* ───────── Avatar */}
        <Block title={sec.avatar} id="sg-avatar">
          <div className="flex flex-col gap-8 rounded-card border border-line bg-surface p-6 shadow-card">
            <Sub title={s.avatarSizes}>
              <div className="flex flex-wrap items-end gap-8">
                {(["sm", "md", "lg", "xl"] as const).map((size) => (
                  <div key={size} className="flex flex-col items-center gap-2">
                    <ChildAvatar seed={ex.enfant.seed} name={ex.enfant.name} sex={ex.enfant.sex} mood={4} size={size} />
                    <span className="font-mono text-xs text-ink-muted">{size}</span>
                  </div>
                ))}
                <div className="flex flex-col items-center gap-2">
                  <UserAvatar seed={ex.intervenant.seed} name={ex.intervenant.name} size="lg" />
                  <span className="font-mono text-xs text-ink-muted">UserAvatar</span>
                </div>
              </div>
            </Sub>
            <Sub title={s.avatarMoods}>
              <div className="flex flex-wrap gap-6">
                {MOOD_LEVELS.map((m, i) => (
                  <div key={m} className="flex flex-col items-center gap-3">
                    <ChildAvatar
                      seed={ex.humeurs[i].seed}
                      sex={ex.humeurs[i].sex}
                      name={t.moods[m]}
                      mood={m}
                      size="lg"
                    />
                    <MoodBadge level={m} />
                  </div>
                ))}
              </div>
            </Sub>
          </div>
        </Block>

        {/* ───────── AvatarLive */}
        <Block title={sec.avatarLive} id="sg-avatar-live">
          <p className="max-w-prose text-sm text-ink-muted">{s.avatarLiveHint}</p>
          <div className="grid gap-6 xl:grid-cols-2">
            {([2, 3, 5] as MoodLevel[]).map((m) => (
              <div key={m} className="flex flex-col items-center rounded-card border border-line bg-surface p-4 shadow-card sm:p-6">
                <AvatarLive
                  src={childAvatarUri(ex.avatarVivant.seed, ex.avatarVivant.sex)}
                  name={ex.avatarVivant.name}
                  mood={m}
                  bubbles={buildBubbles(ex.avatarVivant.interests)}
                  footer={<MoodBadge level={m} size="md" withPrefix detail={s.moodDetail} />}
                />
              </div>
            ))}
          </div>
        </Block>

        {/* ───────── RoadmapRoad */}
        <Block title={sec.road} id="sg-road">
          <p className="max-w-prose text-sm text-ink-muted">{s.roadHint}</p>
          <div className="rounded-card border border-line bg-surface p-3 shadow-card sm:p-5">
            <RoadmapRoad
              phase={3}
              entryDate={ex.route.entryDate}
              returnDate={ex.route.returnDate}
              avatar={{ src: childAvatarUri(ex.enfant.seed, ex.enfant.sex), name: ex.enfant.name, mood: 4 }}
              flags={ex.route.flags.map((f, i) => ({ id: `sg-${i}`, ...f }))}
            />
          </div>
        </Block>

        {/* ───────── SegmentedControl */}
        <Block title={sec.segmented} id="sg-segmented">
          <SegmentedControl
            label={sec.segmented}
            active="activites"
            items={[
              { key: "seances", label: t.sessions.space.psychologue.title, to: "/styleguide", icon: NotebookPen },
              { key: "humeur", label: t.followup.sections.humeur, to: "/styleguide", icon: Sparkles },
              { key: "activites", label: t.followup.sections.activites, to: "/styleguide", icon: CalendarCheck, hint: t.followup.sections.readOnly },
            ]}
          />
        </Block>

        {/* ───────── Champs de formulaire */}
        <Block title={sec.form} id="sg-form">
          <div className="grid max-w-2xl gap-4 rounded-card border border-line bg-surface p-6 shadow-card">
            <FormSample />
          </div>
        </Block>

        {/* ───────── Icônes */}
        <Block title={sec.icons} id="sg-icons">
          <div className="flex flex-wrap gap-4 rounded-card border border-line bg-surface p-6 text-ink shadow-card">
            {[Users, BookOpen, HeartPulse, ShieldCheck, NotebookPen, CalendarCheck, Route, Map, Sparkles, Bell, Inbox, AlertTriangle].map(
              (Icon, i) => (
                <span key={i} className="grid size-11 place-items-center rounded-lg bg-muted">
                  <Icon className="size-5" aria-hidden />
                </span>
              ),
            )}
          </div>
        </Block>
      </main>
    </div>
  )
}
