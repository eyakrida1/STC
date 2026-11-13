import type { AppNotification, NotificationKind } from "@/types"
import { db, newId, nowISO, persist, requireUser, simulate } from "./client"

/** Usage interne à api/ : crée une notification (sans doublon non lu pour le même enfant et le même type). */
export function notify(userId: string, kind: NotificationKind, childId: string | null) {
  const list = db().notifications
  const existing = list.find((n) => n.userId === userId && n.kind === kind && n.childId === childId && n.readAt === null)
  if (existing) {
    existing.createdAt = nowISO()
    return
  }
  list.push({ id: newId("notif"), userId, kind, childId, createdAt: nowISO(), readAt: null })
}

export interface NotificationView extends AppNotification {
  childFirstName: string | null
}

export function listMyNotifications(): Promise<NotificationView[]> {
  return simulate(() => {
    const me = requireUser()
    const children = db().children
    return db()
      .notifications.filter((n) => n.userId === me.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((n) => ({
        ...n,
        childFirstName: children.find((c) => c.id === n.childId)?.identity.firstName ?? null,
      }))
  })
}

export function markNotificationRead(id: string): Promise<void> {
  return simulate(() => {
    const me = requireUser()
    const n = db().notifications.find((x) => x.id === id && x.userId === me.id)
    if (n && !n.readAt) {
      n.readAt = nowISO()
      persist()
    }
  })
}

export function markAllNotificationsRead(): Promise<void> {
  return simulate(() => {
    const me = requireUser()
    const now = nowISO()
    db().notifications.forEach((n) => {
      if (n.userId === me.id && !n.readAt) n.readAt = now
    })
    persist()
  })
}
