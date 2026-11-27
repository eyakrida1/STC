import type { AppNotification } from "@/types"
import { get, post, seg } from "./client"

export interface NotificationView extends AppNotification {
  childFirstName: string | null
}

export function listMyNotifications(): Promise<NotificationView[]> {
  return get<NotificationView[]>("/notifications")
}

export function markNotificationRead(id: string): Promise<void> {
  return post<void>(`/notifications/${seg(id)}/read`)
}

export function markAllNotificationsRead(): Promise<void> {
  return post<void>("/notifications/read-all")
}
