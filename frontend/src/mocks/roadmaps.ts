// Données FICTIVES : roadmap commune de chaque enfant (3 parties validées par leur responsable).
import type {
  EducationContent,
  ISODateTime,
  PsychologicalContent,
  Roadmap,
  RoadmapPart,
  SocialContent,
} from "@/types"
import { at, daysAgo, daysAhead, monthsAgo } from "./dates"

function part<T>(owner: RoadmapPart<T>["owner"], by: string, validatedAt: ISODateTime, content: T): RoadmapPart<T> {
  const v = { version: 1, content, validatedAt, validatedBy: by, decision: "initiale" as const, justification: null }
  return { owner, validated: v, pending: null, history: [v], rejected: [] }
}

interface Spec {
  childId: string
  objective: string
  careerTrack: string
  progressPercent: number
  validatedAt: ISODateTime
  education: EducationContent
  psy: PsychologicalContent
  social: SocialContent
}

function make(s: Spec): Roadmap {
  return {
    childId: s.childId,
    objective: s.objective,
    careerTrack: s.careerTrack,
    progressPercent: s.progressPercent,
    updatedAt: s.validatedAt,
    parts: {
      education: part("educateur", "u-edu", s.validatedAt, s.education),
      psychologique: part("psychologue", "u-psy", s.validatedAt, s.psy),
      sociale: part("social", "u-soc", s.validatedAt, s.social),
    },
  }
}

export function buildRoadmaps(): Roadmap[] {
  const roadmaps = [
    make({
      childId: "c-yassine",
      objective: "Entrer en formation électricité bâtiment",
      careerTrack: "Électricien bâtiment (CAP)",
      progressPercent: 45,
      validatedAt: at(daysAgo(30), 11),
      education: {
        levelAtEntry: "5e année de base",
        levelNow: "6e année de base",
        acquiredSkills: ["Câblage simple", "Respect des consignes de sécurité"],
        milestones: [
          { date: monthsAgo(6, 12), label: "Évaluation scolaire initiale" },
          { date: monthsAgo(3, 2), label: "Début de l'atelier électricité" },
        ],
        currentActivities: ["Atelier électricité (2 fois par semaine)", "Soutien en lecture"],
        skillGauges: [
          { skill: "Lecture", level: 2 },
          { skill: "Calcul", level: 3 },
          { skill: "Ponctualité", level: 3 },
          { skill: "Travail en équipe", level: 4 },
        ],
        nextSteps: [
          { label: "Lire une notice technique simple", dueDate: daysAhead(30) },
          { label: "Visite du centre de formation de Ben Arous", dueDate: daysAhead(45) },
        ],
        careerTracks: [
          { title: "Électricien bâtiment", reason: "Très à l'aise à l'atelier électricité" },
          { title: "Mécanicien moto", reason: "Centre d'intérêt exprimé par Yassine" },
          { title: "Agent de maintenance", reason: "Goût pour le bricolage" },
        ],
      },
      psy: {
        profile: "Adolescent attachant, en manque de valorisation, qui se mobilise sur le concret.",
        character: ["Serviable", "Persévérant à l'atelier", "Vite découragé à l'écrit"],
        progress: ["Humeur plus stable depuis deux mois"],
        toWork: ["Patience face à l'échec", "Expression des émotions"],
        nextSteps: [{ label: "Consultation de suivi toutes les deux semaines", dueDate: daysAhead(14) }],
      },
      social: {
        familySummary: "Famille unie mais aux revenus très instables ; la mère est l'interlocutrice principale.",
        aidsSummary: ["Aide aux familles nécessiteuses : déposée"],
        nextSteps: [{ label: "Relancer le dossier d'aide", dueDate: daysAhead(20) }],
      },
    }),
    make({
      childId: "c-amira",
      objective: "Stabiliser la situation et évaluer les besoins",
      careerTrack: "À définir",
      progressPercent: 10,
      validatedAt: at(daysAgo(7), 10),
      education: {
        levelAtEntry: "À évaluer",
        levelNow: "À évaluer",
        acquiredSkills: [],
        milestones: [{ date: daysAgo(12), label: "Inscription au centre" }],
        currentActivities: ["Atelier dessin"],
        skillGauges: [],
        nextSteps: [{ label: "Évaluation scolaire initiale", dueDate: daysAhead(10) }],
        careerTracks: [],
      },
      psy: {
        profile: "Jeune fille réservée, en période d'adaptation.",
        character: ["Calme", "Observatrice"],
        progress: [],
        toWork: ["Confiance en soi"],
        nextSteps: [{ label: "Consultation hebdomadaire", dueDate: daysAhead(7) }],
      },
      social: {
        familySummary: "Mère seule, hébergée chez une tante, à la recherche d'un logement.",
        aidsSummary: [],
        nextSteps: [{ label: "Constituer le dossier carte de soins gratuits", dueDate: daysAhead(15) }],
      },
    }),
    make({
      childId: "c-hamza",
      objective: "Reprendre un rythme régulier et construire un projet",
      careerTrack: "Aide-cuisinier (piste)",
      progressPercent: 25,
      validatedAt: at(daysAgo(25), 10),
      education: {
        levelAtEntry: "7e année de base",
        levelNow: "7e année de base",
        acquiredSkills: ["Règles d'hygiène en cuisine"],
        milestones: [{ date: monthsAgo(2, 20), label: "Entrée à l'atelier cuisine" }],
        currentActivities: ["Atelier cuisine", "Remise à niveau en français"],
        skillGauges: [
          { skill: "Lecture", level: 3 },
          { skill: "Ponctualité", level: 2 },
          { skill: "Travail en équipe", level: 2 },
        ],
        nextSteps: [{ label: "Assiduité sur 4 semaines", dueDate: daysAhead(28) }],
        careerTracks: [{ title: "Aide-cuisinier", reason: "Motivé à l'atelier cuisine" }],
      },
      psy: {
        profile: "Adolescent impulsif, en quête de reconnaissance.",
        character: ["Énergique", "Loyal envers ses amis"],
        progress: ["Accepte désormais les consultations"],
        toWork: ["Gestion de la colère", "Relations avec les pairs"],
        nextSteps: [{ label: "Consultation de suivi chaque semaine", dueDate: daysAhead(7) }],
      },
      social: {
        familySummary: "Famille présente, père très investi depuis la fin du placement.",
        aidsSummary: [],
        nextSteps: [{ label: "Mettre à jour le carnet de vaccination", dueDate: daysAhead(30) }],
      },
    }),
    make({
      childId: "c-nour",
      objective: "Entrer en formation pâtisserie",
      careerTrack: "Pâtissière (BTP)",
      progressPercent: 70,
      validatedAt: at(daysAgo(40), 10),
      education: {
        levelAtEntry: "8e année de base",
        levelNow: "9e année de base",
        acquiredSkills: ["Hygiène alimentaire", "Recettes de base"],
        milestones: [
          { date: monthsAgo(9, 1), label: "Remise à niveau validée en arabe" },
          { date: monthsAgo(2, 15), label: "Premier stage découverte" },
        ],
        currentActivities: ["Stage découverte en pâtisserie", "Soutien en calcul"],
        skillGauges: [
          { skill: "Calcul", level: 2 },
          { skill: "Ponctualité", level: 3 },
          { skill: "Travail en équipe", level: 4 },
        ],
        nextSteps: [{ label: "Dossier d'inscription au centre de formation", dueDate: daysAhead(20) }],
        careerTracks: [
          { title: "Pâtissière", reason: "Projet porté par Nour, stage réussi" },
          { title: "Esthéticienne", reason: "Centre d'intérêt secondaire" },
        ],
      },
      psy: {
        profile: "Jeune fille déterminée, qui a repris confiance.",
        character: ["Volontaire", "Sociable"],
        progress: ["Humeur stable et positive depuis trois mois"],
        toWork: ["Gestion du stress avant les échéances"],
        nextSteps: [{ label: "Préparer l'entretien d'entrée en formation", dueDate: daysAhead(15) }],
      },
      social: {
        familySummary: "Mère et sœur soutiennent le projet ; père sans emploi.",
        aidsSummary: ["Aide à la rentrée scolaire : accordée"],
        nextSteps: [{ label: "Demander une bourse de formation", dueDate: daysAhead(25) }],
      },
    }),
    make({
      childId: "c-skander",
      objective: "Terminer la formation mécanique et intégrer le garage familial",
      careerTrack: "Mécanicien automobile",
      progressPercent: 90,
      validatedAt: at(daysAgo(20), 10),
      education: {
        levelAtEntry: "9e année de base",
        levelNow: "Formation mécanique, 1re année",
        acquiredSkills: ["Vidange", "Diagnostic simple", "Travail en atelier"],
        milestones: [
          { date: monthsAgo(7, 9), label: "Admission au centre de formation" },
          { date: monthsAgo(1, 4), label: "Stage en garage validé" },
        ],
        currentActivities: ["Formation mécanique automobile"],
        skillGauges: [
          { skill: "Ponctualité", level: 5 },
          { skill: "Travail en équipe", level: 4 },
          { skill: "Calcul", level: 4 },
        ],
        nextSteps: [{ label: "Examen de fin de première année", dueDate: daysAhead(60) }],
        careerTracks: [{ title: "Mécanicien automobile", reason: "Formation en cours, place au garage familial" }],
      },
      psy: {
        profile: "Jeune homme autonome et confiant.",
        character: ["Responsable", "Calme"],
        progress: ["Gestion du stress", "Relations apaisées avec le père"],
        toWork: ["Gestion du budget personnel"],
        nextSteps: [{ label: "Bilan de sortie", dueDate: daysAhead(45) }],
      },
      social: {
        familySummary: "Famille stable, prête à accueillir Skander.",
        aidsSummary: [],
        nextSteps: [{ label: "Préparer la sortie avec la famille", dueDate: daysAhead(40) }],
      },
    }),
    make({
      childId: "c-rania",
      objective: "Retrouver des repères et reprendre la scolarité",
      careerTrack: "Coiffure (piste)",
      progressPercent: 20,
      validatedAt: at(daysAgo(9), 10),
      education: {
        levelAtEntry: "4e année de base",
        levelNow: "5e année de base",
        acquiredSkills: ["Lecture de phrases simples"],
        milestones: [
          { date: monthsAgo(13, 1), label: "Premier séjour : remise à niveau" },
          { date: monthsAgo(1, 9), label: "Retour au centre" },
        ],
        currentActivities: ["Soutien en lecture", "Atelier chant"],
        skillGauges: [
          { skill: "Lecture", level: 2 },
          { skill: "Ponctualité", level: 3 },
        ],
        nextSteps: [{ label: "Réévaluation scolaire", dueDate: daysAhead(12) }],
        careerTracks: [{ title: "Coiffeuse", reason: "Intérêt exprimé par Rania" }],
      },
      psy: {
        profile: "Jeune fille sensible, affectée par l'échec du retour en famille.",
        character: ["Créative", "Attentionnée envers ses frères et sœurs"],
        progress: [],
        toWork: ["Estime de soi", "Sentiment d'échec"],
        nextSteps: [{ label: "Consultation hebdomadaire", dueDate: daysAhead(7) }],
      },
      social: {
        familySummary: "Mère seule avec quatre enfants en logement précaire ; grand-mère disponible.",
        aidsSummary: ["Aide aux familles nécessiteuses : à préparer"],
        nextSteps: [{ label: "Organiser les week-ends chez la grand-mère", dueDate: daysAhead(10) }],
      },
    }),
  ]

  // Proposition IA en attente : partie éducation de Nour (validation attendue de l'éducateur).
  const nour = roadmaps.find((r) => r.childId === "c-nour")!
  nour.parts.education.pending = {
    id: "pr-nou-edu",
    createdAt: at(daysAgo(3), 18),
    trigger: "demande",
    requestedBy: "u-soc",
    content: {
      ...nour.parts.education.validated.content,
      skillGauges: [
        { skill: "Calcul", level: 2 },
        { skill: "Ponctualité", level: 5 },
        { skill: "Travail en équipe", level: 4 },
      ],
      nextSteps: [
        { label: "Dossier d'inscription au centre de formation", dueDate: daysAhead(20) },
        { label: "Exercices de proportions appliqués aux recettes", dueDate: daysAhead(30) },
      ],
    },
    changes: [
      { field: "skillGauges", summary: "Ponctualité : 3 → 5", sourceSessionIds: ["se-nou-1"] },
      { field: "nextSteps", summary: "Nouvelle action : proportions appliquées aux recettes", sourceSessionIds: ["se-nou-1"] },
    ],
    comments: [],
  }

  // Proposition IA en attente depuis plus de 7 jours : partie psychologique de Hamza.
  const hamza = roadmaps.find((r) => r.childId === "c-hamza")!
  hamza.parts.psychologique.pending = {
    id: "pr-ham-psy",
    createdAt: at(daysAgo(9), 17),
    trigger: "auto",
    requestedBy: null,
    content: {
      ...hamza.parts.psychologique.validated.content,
      character: ["Énergique", "Loyal envers ses amis", "S'investit quand on lui confie une responsabilité"],
    },
    changes: [
      {
        field: "character",
        summary: "Ajout : s'investit quand on lui confie une responsabilité",
        sourceSessionIds: ["se-ham-1"],
      },
    ],
    comments: [],
  }

  return roadmaps
}
