/**
 * Modèle de données CDIS — partagé par la couche api/ et les pages.
 * Ces types décrivent le contrat de la future API Django : les garder stables.
 */

export type ISODate = string // "2026-11-13"
export type ISODateTime = string // "2026-11-13T09:30:00.000Z"

// ───────────────────────────── Rôles & utilisateurs
export type Role = "educateur" | "psychologue" | "social" | "directeur"
export type ProfessionalRole = Exclude<Role, "directeur">
export const PROFESSIONAL_ROLES: ProfessionalRole[] = ["educateur", "psychologue", "social"]

export interface Pole {
  id: string
  name: string // « CDIS Tunis »
  city: string
}

export interface User {
  id: string
  username: string
  role: Role
  firstName: string
  lastName: string
  birthDate: ISODate
  phone: string
  email: string
  cin: string // non modifiable par l'intervenant
  poleId: string
  avatarSeed: string // photo de démonstration (DiceBear, généré localement)
}

export type ProfileUpdate = Pick<User, "firstName" | "lastName" | "birthDate" | "phone" | "email">

// ───────────────────────────── Échelles
export type MoodLevel = 1 | 2 | 3 | 4 | 5
export type PhaseId = 1 | 2 | 3 | 4 | 5
export const PHASES: PhaseId[] = [1, 2, 3, 4, 5]
export const MOOD_LEVELS: MoodLevel[] = [1, 2, 3, 4, 5]

// ───────────────────────────── Enfant (partie commune du dossier)
export type Sex = "M" | "F"
export type ChildStatus = "present" | "sorti"
export type ReferralSource = "delegue_protection" | "famille" | "ecole" | "juge" | "association" | "autre"
export type ExitDestination = "ecole" | "formation" | "emploi" | "famille" | "autre_structure" | "abandon"

export interface Identity {
  firstName: string
  lastName: string
  birthDate: ISODate
  sex: Sex
  gouvernorat: string
  address: string
  language: string
  avatarSeed: string
}

export interface Stay {
  id: string
  entryDate: ISODate
  exitDate: ISODate | null
  exitDestination: ExitDestination | null
}

export interface Journey {
  phase: PhaseId
  phaseHistory: { phase: PhaseId; enteredAt: ISODate; stayId: string }[]
  status: ChildStatus
  entryDate: ISODate // entrée du séjour en cours
  referredBy: ReferralSource
  stays: Stay[] // le dernier est le séjour en cours
}

export interface Parent {
  fullName: string
  alive: boolean
  profession: string
  phone: string | null
}

export interface Family {
  father: Parent
  mother: Parent
  guardian: { fullName: string; relation: string; phone: string }
  siblings: { firstName: string; age: number; sex: Sex }[]
  emergencyContact: { fullName: string; relation: string; phone: string }
}

export type Housing = "proprietaire" | "locataire" | "heberge" | "precaire"

export interface EconomicSituation {
  monthlyIncomeTnd: number
  housing: Housing
  householdSize: number
  // les aides de l'État en cours sont lues dans AidApplication (une seule source)
}

export interface Schooling {
  lastSchool: string
  nominalLevel: string // dernière classe fréquentée
  actualLevel: string // niveau réel évalué
  gapYears: number
  subjects: { subject: string; nominal: string; actual: string }[]
}

export interface Health {
  bloodGroup: string
  allergies: string[]
  chronicConditions: string[]
  treatments: string[]
  disability: string | null
  vaccinationUpToDate: boolean
  doctor: string
}

export interface LegalMeasure {
  type: string
  authority: string
  startDate: ISODate
  endDate: ISODate | null
  center: string | null
  ongoingFollowUp: boolean
}

export interface LegalSituation {
  hasMeasure: boolean
  measures: LegalMeasure[]
}

export interface Interests {
  hobbies: string[]
  interests: string[]
  skillsToDevelop: string[]
  wishes: string // avec les mots de l'enfant
}

export interface GeneralMood {
  level: MoodLevel
  updatedAt: ISODateTime
  updatedBy: string // userId (psychologue)
  history: { date: ISODate; level: MoodLevel }[]
}

export interface Consent {
  given: boolean
  by: string
  date: ISODate | null
}

export type Assignments = Record<ProfessionalRole, string> // rôle → userId

export interface Child {
  id: string
  code: string // code dossier
  poleId: string
  identity: Identity
  journey: Journey
  family: Family
  economic: EconomicSituation
  schooling: Schooling
  health: Health
  legal: LegalSituation
  interests: Interests
  mood: GeneralMood
  consent: Consent
  assigned: Assignments
}

/** Blocs de la partie commune — chacun a un propriétaire (voir lib/access.ts). */
export type ChildBlock =
  | "identity"
  | "journey"
  | "family"
  | "economic"
  | "schooling"
  | "health"
  | "legal"
  | "interests"
  | "mood"
  | "consent"

/** Version allégée pour la liste « Mes enfants ». */
export interface ChildSummary {
  id: string
  code: string
  firstName: string
  lastName: string
  age: number
  sex: Sex
  avatarSeed: string
  phase: PhaseId
  status: ChildStatus
  mood: MoodLevel
  moodUpdatedAt: ISODateTime
  unreadNotes: number // pour l'utilisateur connecté
  pendingValidation: boolean // une partie de roadmap attend la validation de l'utilisateur connecté
  recentAbsences: number // sur les 7 derniers jours
  returned: boolean // revenu au centre après une sortie
  lastActivityAt: ISODateTime | null // dernière séance enregistrée par l'équipe (date seule, jamais le contenu)
}

// ───────────────────────────── Séances à 3 sorties
export type SessionKind = "consultation" | "visite" | "observation"
export type ConsultationType = "initiale" | "suivi" | "crise"
export type VisitLocation = "domicile" | "centre" | "autre"

export type MoodScaleKey = "humeur" | "anxiete" | "confiance" | "colere" | "relations" | "motivation"
export const MOOD_SCALE_KEYS: MoodScaleKey[] = ["humeur", "anxiete", "confiance", "colere", "relations", "motivation"]
export type MoodScales = Record<MoodScaleKey, MoodLevel>

export interface ConsultationDetails {
  kind: "consultation"
  durationMin: number
  type: ConsultationType
  scales: MoodScales // seule « humeur » est partagée
}

export interface VisitDetails {
  kind: "visite"
  location: VisitLocation
  peopleMet: string[]
  livingConditions: string
}

export interface ObservationDetails {
  kind: "observation"
  context: string // activité ou moment observé
  durationMin: number
}

export type SessionDetails = ConsultationDetails | VisitDetails | ObservationDetails

export interface SharedNote {
  text: string
  sharedAt: ISODateTime
  recipients: { userId: string; readAt: ISODateTime | null }[] // état lu par destinataire
}

export interface AiNote {
  text: string
  consumedByProposalId: string | null // null = pas encore utilisée par l'IA
}

export interface Session {
  id: string
  childId: string
  authorId: string
  authorRole: ProfessionalRole
  date: ISODate
  createdAt: ISODateTime
  updatedAt: ISODateTime | null // correction possible pendant 24 h
  details: SessionDetails
  privateNote: string | null // l'auteur seul
  sharedNote: SharedNote | null // destinataires cochés
  aiNote: AiNote | null // personne d'autre ; sert à la roadmap
}

export interface NewSession {
  childId: string
  date: ISODate
  details: SessionDetails
  privateNote: string | null
  sharedNote: { text: string; recipientIds: string[] } | null
  aiNote: string | null
}

/** Note partagée telle que la voit un destinataire (Notes reçues). */
export interface ReceivedNote {
  sessionId: string
  childId: string
  authorId: string
  authorName: string
  authorRole: ProfessionalRole
  sessionKind: SessionKind
  sessionDate: ISODate
  sharedAt: ISODateTime
  text: string
  readAt: ISODateTime | null
}

// ───────────────────────────── Roadmap IA
export type RoadmapPartKey = "education" | "psychologique" | "sociale"
export const ROADMAP_PART_KEYS: RoadmapPartKey[] = ["education", "psychologique", "sociale"]

export interface NextStep {
  label: string
  dueDate: ISODate
}

export interface EducationContent {
  levelAtEntry: string
  levelNow: string
  acquiredSkills: string[]
  milestones: { date: ISODate; label: string }[]
  currentActivities: string[]
  skillGauges: { skill: string; level: MoodLevel }[]
  nextSteps: NextStep[]
  careerTracks: { title: string; reason: string }[]
}

export interface PsychologicalContent {
  profile: string
  character: string[]
  progress: string[]
  toWork: string[]
  nextSteps: NextStep[]
}

export interface SocialContent {
  familySummary: string
  aidsSummary: string[]
  nextSteps: NextStep[]
}

export interface RoadmapContentMap {
  education: EducationContent
  psychologique: PsychologicalContent
  sociale: SocialContent
}

export interface RoadmapChange {
  field: string
  summary: string
  sourceSessionIds: string[] // notes qui justifient le changement
}

export interface RoadmapComment {
  id: string
  authorId: string
  text: string
  createdAt: ISODateTime
}

export interface RoadmapVersion<T> {
  version: number
  content: T
  validatedAt: ISODateTime
  validatedBy: string
  decision: "valide" | "modifie" | "initiale"
  justification: string | null
}

export interface RoadmapProposal<T> {
  id: string
  createdAt: ISODateTime
  trigger: "demande" | "auto"
  requestedBy: string | null
  content: T
  changes: RoadmapChange[]
  comments: RoadmapComment[]
}

export interface RoadmapPart<T> {
  owner: ProfessionalRole
  validated: RoadmapVersion<T>
  pending: RoadmapProposal<T> | null // tant que non validée, on affiche `validated` + « mise à jour en attente »
  history: RoadmapVersion<T>[]
  rejected: { proposalId: string; by: string; at: ISODateTime; justification: string }[]
}

export interface Roadmap {
  childId: string
  objective: string
  careerTrack: string
  progressPercent: number
  updatedAt: ISODateTime
  parts: { [K in RoadmapPartKey]: RoadmapPart<RoadmapContentMap[K]> }
}

// ───────────────────────────── Présence, activités, aides
export type AttendanceStatus = "present" | "absent" | "absent_justifie"

export interface AttendanceEntry {
  childId: string
  date: ISODate
  status: AttendanceStatus
  reason: string | null
}

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 // lundi → samedi

export interface Activity {
  id: string
  childId: string
  weekday: Weekday
  start: string // "10:00"
  end: string
  title: string
  objective: string
}

export interface AidProgram {
  id: string
  label: string
}

export type AidStatus = "a_preparer" | "depose" | "accorde" | "refuse"

export interface AidApplication {
  id: string
  childId: string
  programId: string
  beneficiary: "enfant" | "famille"
  status: AidStatus
  submittedAt: ISODate | null
  decidedAt: ISODate | null
  missingDocuments: string
}

// ───────────────────────────── Notifications & audit
export type NotificationKind = "note_recue" | "validation_attendue" | "absence" | "roadmap_mise_a_jour"

export interface AppNotification {
  id: string
  userId: string
  kind: NotificationKind
  childId: string | null
  createdAt: ISODateTime
  readAt: ISODateTime | null
}

export interface AuditEntry {
  id: string
  userId: string
  childId: string
  action: "ouverture_sante" | "ouverture_judiciaire"
  at: ISODateTime
}
