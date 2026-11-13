import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { CheckCheck, Inbox, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { EmptyState, NoteCard, UnreadDivider } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/context"
import { emitDataChanged } from "@/lib/events"
import { formatDate } from "@/lib/format"
import type { ReceivedNote } from "@/types"

/**
 * Onglet « Notes reçues » (identique pour les 3 rôles).
 * « Nouvelles (n) » en haut, « Déjà lues » en dessous. Ouvrir ou déplier une note la marque comme lue
 * POUR CET UTILISATEUR ; elle glisse dans « Déjà lues » (animation de mise en page partagée, coupée si reduced-motion).
 */
export function NotesTab({ childId, onUnreadChange }: { childId: string; onUnreadChange: (n: number) => void }) {
  const { t, intlLocale } = useI18n()
  const N = t.notes
  const [notes, setNotes] = useState<ReceivedNote[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    api
      .listReceivedNotes(childId)
      .then((list) => {
        setNotes(list)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [childId])

  useEffect(() => {
    load()
  }, [load])

  const unread = notes?.filter((n) => !n.readAt) ?? []
  const read = notes?.filter((n) => n.readAt) ?? []

  const publish = (list: ReceivedNote[]) => {
    onUnreadChange(list.filter((n) => !n.readAt).length) // compteur de l'onglet (la cloche suit après l'enregistrement)
  }

  const markRead = (id: string) => {
    if (!notes) return
    const target = notes.find((n) => n.sessionId === id)
    if (!target || target.readAt) return
    const next = notes.map((n) => (n.sessionId === id ? { ...n, readAt: new Date().toISOString() } : n))
    setNotes(next) // optimiste : la carte glisse tout de suite
    publish(next)
    api.markNoteRead(id).then(() => emitDataChanged("notes")).catch(load)
  }

  const markAll = async () => {
    if (!notes) return
    const now = new Date().toISOString()
    const next = notes.map((n) => (n.readAt ? n : { ...n, readAt: now }))
    setNotes(next)
    publish(next)
    try {
      await api.markAllNotesRead(childId)
      emitDataChanged("notes")
      toast.success(N.allRead)
    } catch {
      load()
    }
  }

  const setOpen = (id: string, open: boolean) =>
    setExpanded((s) => {
      const next = new Set(s)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })

  const card = (n: ReceivedNote) => (
    <motion.li
      key={n.sessionId}
      layout="position"
      layoutId={`note-${n.sessionId}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
    >
      <NoteCard
        authorName={n.authorName}
        authorRole={n.authorRole}
        authorAvatarSeed={n.authorAvatarSeed}
        sharedAt={n.sharedAt}
        sessionLabel={t.sessions.from(t.sessions.kinds[n.sessionKind], formatDate(n.sessionDate, intlLocale))}
        text={n.text}
        unread={!n.readAt}
        onOpen={() => markRead(n.sessionId)}
        expanded={expanded.has(n.sessionId)}
        onExpandedChange={(o) => {
          setOpen(n.sessionId, o)
          if (o) markRead(n.sessionId)
        }}
      />
    </motion.li>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-ink">{N.received}</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">{N.description}</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" onClick={markAll}>
            <CheckCheck data-icon="inline-start" aria-hidden />
            {N.markAllRead}
          </Button>
        )}
      </div>

      {failed ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={TriangleAlert} title={t.pages.child.loadError} action={<Button variant="outline" onClick={load}>{t.pages.children.retry}</Button>} />
        </div>
      ) : notes === null ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-card border border-line bg-surface" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState icon={Inbox} title={N.empty} description={N.emptyText} />
        </div>
      ) : (
        <LayoutGroup>
          <div className="flex max-w-3xl flex-col gap-3">
            <UnreadDivider label={N.unread} count={unread.length} tone="new" />
            {unread.length === 0 ? (
              <p className="py-2 text-center text-sm text-ink-muted">{N.noneUnread}</p>
            ) : (
              <ul aria-label={`${N.unread} (${unread.length})`} className="flex flex-col gap-3">
                <AnimatePresence initial={false}>{unread.map(card)}</AnimatePresence>
              </ul>
            )}

            {read.length > 0 && (
              <>
                <UnreadDivider label={N.read} count={read.length} className="mt-2" />
                <ul aria-label={N.read} className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>{read.map(card)}</AnimatePresence>
                </ul>
              </>
            )}
          </div>
        </LayoutGroup>
      )}
    </div>
  )
}
