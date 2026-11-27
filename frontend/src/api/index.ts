/**
 * Couche d'accès aux données — SEUL point d'entrée des pages.
 * Appels HTTP à l'API Django (dossier backend/) ; les signatures sont le contrat des pages.
 */
export { API_BASE, ApiError, UNAUTHORIZED_EVENT, type ApiErrorCode } from "./client"
export * from "./auth"
export { listSensitiveAccess, type AuditFilters, type AuditLog, type AuditView } from "./audit"
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
export { getStyleguideExamples, type StyleguideExamples } from "./styleguide"
export { getDashboardStats, PERIOD_DAYS, type DashboardStats, type Kpi, type StatsPeriod } from "./stats"
