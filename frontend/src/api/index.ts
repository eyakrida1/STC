/**
 * Couche d'accès aux données — SEUL point d'entrée des pages.
 * Aujourd'hui : données fictives + localStorage. Demain : appels à l'API Django (mêmes signatures).
 */
export { ApiError, SIMULATED_LATENCY_MS, type ApiErrorCode } from "./client"
export * from "./auth"
export * from "./children"
export * from "./followup"
export {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationView,
} from "./notifications"
export {
  commentRoadmapProposal,
  generateRoadmapProposal,
  getRoadmap,
  getRoadmapSources,
  rejectRoadmapPart,
  requestRoadmapUpdate,
  updateRoadmapGoal,
  validateRoadmapPart,
} from "./roadmap"
export * from "./sessions"
export { getDashboardStats, PERIOD_DAYS, type DashboardStats, type Kpi, type StatsPeriod } from "./stats"
