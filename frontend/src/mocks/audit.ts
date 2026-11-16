// Données FICTIVES : quelques ouvertures passées des blocs sensibles (Santé, Situation judiciaire),
// pour que le journal des accès ne soit pas vide en démo.
import type { AuditEntry } from "@/types"
import { at, daysAgo } from "./dates"

const spec: [userId: string, childId: string, action: AuditEntry["action"], days: number, hour: number][] = [
  ["u-soc", "c-amira", "ouverture_sante", 12, 9],
  ["u-psy", "c-amira", "ouverture_sante", 5, 14],
  ["u-psy", "c-hamza", "ouverture_judiciaire", 6, 10],
  ["u-soc", "c-hamza", "ouverture_judiciaire", 20, 11],
  ["u-edu", "c-hamza", "ouverture_sante", 3, 16],
  ["u-soc", "c-rania", "ouverture_sante", 2, 15],
  ["u-psy", "c-yassine", "ouverture_judiciaire", 38, 10],
  ["u-edu", "c-yassine", "ouverture_judiciaire", 25, 9],
  ["u-dir", "c-nour", "ouverture_sante", 9, 17],
  ["u-soc", "c-skander", "ouverture_sante", 70, 11],
]

export function buildAudit(): AuditEntry[] {
  return spec.map(([userId, childId, action, d, h], i) => ({
    id: `audit-seed-${i + 1}`,
    userId,
    childId,
    action,
    at: at(daysAgo(d), h, 12),
  }))
}
