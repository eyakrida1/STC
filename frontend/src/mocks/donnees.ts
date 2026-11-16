/**
 * DONNÉES DE DÉMONSTRATION — toutes FICTIVES. Toute ressemblance avec des personnes réelles serait fortuite.
 *
 * Ce fichier est la SOURCE UNIQUE des données de la démo : comptes, enfants, séances, roadmaps, présence, activités,
 * aides, notifications, dossiers clos et journal des accès. Aucun écran ne contient de données écrites à la main.
 * Les autres fichiers de mocks/ ne font que transformer ces données en base de démo (mocks/index.ts → buildSeed).
 *
 * Les dates sont RELATIVES au jour où la démo est initialisée (daysAgo, monthsAgo, daysAhead…) pour rester à jour.
 * Importé uniquement par mocks/ (lui-même lu seulement par api/) : jamais par une page.
 */
import type {
  AidApplication,
  AidProgram,
  AppNotification,
  Activity,
  AuditEntry,
  Child,
  EducationContent,
  ExitDestination,
  ISODate,
  ISODateTime,
  MoodLevel,
  MoodScales,
  Pole,
  ProfessionalRole,
  PsychologicalContent,
  Roadmap,
  SessionDetails,
  SocialContent,
  User,
} from "@/types"
import { at, daysAgo, daysAhead, monthsAgo, yearsAgo } from "./dates"


// ═════════════════════════════════════════════════════════════ 1. Pôle et comptes (mot de passe commun « demo »)

export const POLES: Pole[] = [{ id: "pole-tunis", name: "CDIS Tunis", city: "Tunis" }]

export const USERS: User[] = [
  {
    id: "u-edu",
    username: "educateur",
    role: "educateur",
    firstName: "Karim",
    lastName: "Mansouri",
    birthDate: "1988-04-12",
    phone: "+216 20 100 201",
    email: "k.mansouri@cdis-demo.tn",
    cin: "08XXXX21",
    poleId: "pole-tunis",
    avatarSeed: "karim-mansouri",
  },
  {
    id: "u-psy",
    username: "psy",
    role: "psychologue",
    firstName: "Leila",
    lastName: "Haddad",
    birthDate: "1985-09-03",
    phone: "+216 20 100 202",
    email: "l.haddad@cdis-demo.tn",
    cin: "07XXXX45",
    poleId: "pole-tunis",
    avatarSeed: "leila-haddad",
  },
  {
    id: "u-soc",
    username: "social",
    role: "social",
    firstName: "Sami",
    lastName: "Ayari",
    birthDate: "1990-01-27",
    phone: "+216 20 100 203",
    email: "s.ayari@cdis-demo.tn",
    cin: "09XXXX78",
    poleId: "pole-tunis",
    avatarSeed: "sami-ayari",
  },
  {
    id: "u-dir",
    username: "directeur",
    role: "directeur",
    firstName: "Mouna",
    lastName: "Khelifi",
    birthDate: "1976-06-18",
    phone: "+216 20 100 200",
    email: "m.khelifi@cdis-demo.tn",
    cin: "05XXXX12",
    poleId: "pole-tunis",
    avatarSeed: "mouna-khelifi",
  },
]

/** Identifiants de démonstration — mot de passe commun « demo ». Jamais exposés hors de api/. */
export const CREDENTIALS: Record<string, string> = {
  educateur: "demo",
  psy: "demo",
  social: "demo",
  directeur: "demo",
}

export const DEFAULT_ASSIGNMENTS = { educateur: "u-edu", psychologue: "u-psy", social: "u-soc" } as const

// ═════════════════════════════════════════════════════════════ 2. Enfants (6, de 13 à 17 ans, répartis sur les 5 phases)

const moodHistory = (levels: MoodLevel[]) =>
  levels.map((level, i) => ({ date: monthsAgo(levels.length - 1 - i, 8), level }))

const noMeasure = { hasMeasure: false, measures: [] }

export function donneesEnfants(): Child[] {
  return [
    // ── Phase 3 — enfant du scénario de démonstration
    {
      id: "c-yassine",
      code: "TUN-2026-014",
      poleId: "pole-tunis",
      identity: {
        firstName: "Yassine",
        lastName: "Ben Salah",
        birthDate: yearsAgo(15, 2, 9),
        sex: "M",
        gouvernorat: "Tunis",
        address: "Cité Ettadhamen, Tunis",
        language: "Arabe tunisien",
        avatarSeed: "yassine-ben-salah",
      },
      journey: {
        phase: 3,
        phaseHistory: [
          { phase: 1, enteredAt: monthsAgo(8, 3), stayId: "s-yas-1" },
          { phase: 2, enteredAt: monthsAgo(7, 20), stayId: "s-yas-1" },
          { phase: 3, enteredAt: monthsAgo(5, 10), stayId: "s-yas-1" },
        ],
        status: "present",
        entryDate: monthsAgo(8, 3),
        referredBy: "delegue_protection",
        stays: [{ id: "s-yas-1", entryDate: monthsAgo(8, 3), exitDate: null, exitDestination: null }],
      },
      family: {
        father: { fullName: "Mourad Ben Salah", alive: true, profession: "Journalier (bâtiment)", phone: "+216 22 000 101" },
        mother: { fullName: "Samia Ben Salah", alive: true, profession: "Femme au foyer", phone: "+216 22 000 102" },
        guardian: { fullName: "Samia Ben Salah", relation: "Mère", phone: "+216 22 000 102" },
        siblings: [
          { firstName: "Ahmed", age: 19, sex: "M" },
          { firstName: "Eya", age: 9, sex: "F" },
        ],
        emergencyContact: { fullName: "Hedi Ben Salah", relation: "Oncle", phone: "+216 22 000 103" },
      },
      economic: { monthlyIncomeTnd: 450, housing: "locataire", householdSize: 5 },
      schooling: {
        lastSchool: "Collège Ibn Khaldoun, Tunis",
        nominalGrade: 8,
        actualGrade: 6,
        subjects: [
          { subject: "Arabe", nominal: "8e", actual: "6e" },
          { subject: "Français", nominal: "8e", actual: "5e" },
          { subject: "Mathématiques", nominal: "8e", actual: "6e" },
        ],
      },
      health: {
        bloodGroup: "O+",
        allergies: [],
        chronicConditions: [],
        treatments: [],
        disability: null,
        vaccinationUpToDate: true,
        doctor: "Centre de santé de base Ettadhamen",
      },
      legal: {
        hasMeasure: true,
        measures: [
          {
            type: "Mesure éducative en milieu ouvert",
            authority: "Délégué à la protection de l'enfance",
            startDate: monthsAgo(9, 15),
            endDate: null,
            center: null,
            ongoingFollowUp: true,
          },
        ],
      },
      interests: {
        hobbies: ["Football", "Bricolage"],
        interests: ["Électricité", "Mécanique moto"],
        skillsToDevelop: ["Lecture", "Patience", "Ponctualité"],
        wishes: "Je veux travailler avec mes mains et aider ma mère.",
      },
      mood: {
        level: 3,
        updatedAt: at(daysAgo(10), 11),
        updatedBy: "u-psy",
        history: moodHistory([2, 2, 3, 2, 3, 3]),
      },
      consent: { given: true, by: "Samia Ben Salah (mère)", date: monthsAgo(8, 3) },
      assigned: { ...DEFAULT_ASSIGNMENTS },
    },

    // ── Phase 1 — arrivée récente
    {
      id: "c-amira",
      code: "TUN-2026-031",
      poleId: "pole-tunis",
      identity: {
        firstName: "Amira",
        lastName: "Trabelsi",
        birthDate: yearsAgo(14, 5, 22),
        sex: "F",
        gouvernorat: "Ariana",
        address: "Cité Ennasr, Ariana",
        language: "Arabe tunisien",
        avatarSeed: "amira-trabelsi",
      },
      journey: {
        phase: 1,
        phaseHistory: [{ phase: 1, enteredAt: daysAgo(12), stayId: "s-ami-1" }],
        status: "present",
        entryDate: daysAgo(12),
        referredBy: "ecole",
        stays: [{ id: "s-ami-1", entryDate: daysAgo(12), exitDate: null, exitDestination: null }],
      },
      family: {
        father: { fullName: "Nabil Trabelsi", alive: false, profession: "—", phone: null },
        mother: { fullName: "Hayet Trabelsi", alive: true, profession: "Agente d'entretien", phone: "+216 22 000 201" },
        guardian: { fullName: "Hayet Trabelsi", relation: "Mère", phone: "+216 22 000 201" },
        siblings: [{ firstName: "Youssef", age: 11, sex: "M" }],
        emergencyContact: { fullName: "Faten Trabelsi", relation: "Tante", phone: "+216 22 000 202" },
      },
      economic: { monthlyIncomeTnd: 380, housing: "heberge", householdSize: 3 },
      schooling: {
        lastSchool: "École préparatoire Ennasr",
        nominalGrade: 7,
        actualGrade: null,
        subjects: [],
      },
      health: {
        bloodGroup: "A+",
        allergies: ["Pénicilline"],
        chronicConditions: ["Asthme léger"],
        treatments: ["Ventoline en cas de crise"],
        disability: null,
        vaccinationUpToDate: true,
        doctor: "Dr Rym Saidi, Ariana",
      },
      legal: noMeasure,
      interests: {
        hobbies: ["Dessin"],
        interests: ["Couture"],
        skillsToDevelop: ["Confiance en soi"],
        wishes: "Revenir à l'école avec mes amies.",
      },
      mood: {
        level: 2,
        updatedAt: at(daysAgo(5), 15),
        updatedBy: "u-psy",
        history: [{ date: daysAgo(5), level: 2 }],
      },
      consent: { given: true, by: "Hayet Trabelsi (mère)", date: daysAgo(12) },
      assigned: { ...DEFAULT_ASSIGNMENTS },
    },

    // ── Phase 2 — absences récentes
    {
      id: "c-hamza",
      code: "TUN-2026-022",
      poleId: "pole-tunis",
      identity: {
        firstName: "Hamza",
        lastName: "Gharbi",
        birthDate: yearsAgo(16, 1, 3),
        sex: "M",
        gouvernorat: "Ben Arous",
        address: "Mourouj 4, Ben Arous",
        language: "Arabe tunisien",
        avatarSeed: "hamza-gharbi",
      },
      journey: {
        phase: 2,
        phaseHistory: [
          { phase: 1, enteredAt: monthsAgo(3, 2), stayId: "s-ham-1" },
          { phase: 2, enteredAt: monthsAgo(2, 18), stayId: "s-ham-1" },
        ],
        status: "present",
        entryDate: monthsAgo(3, 2),
        referredBy: "juge",
        stays: [{ id: "s-ham-1", entryDate: monthsAgo(3, 2), exitDate: null, exitDestination: null }],
      },
      family: {
        father: { fullName: "Lotfi Gharbi", alive: true, profession: "Chauffeur de taxi", phone: "+216 22 000 301" },
        mother: { fullName: "Naima Gharbi", alive: true, profession: "Couturière", phone: "+216 22 000 302" },
        guardian: { fullName: "Lotfi Gharbi", relation: "Père", phone: "+216 22 000 301" },
        siblings: [
          { firstName: "Mariem", age: 13, sex: "F" },
          { firstName: "Oussama", age: 7, sex: "M" },
        ],
        emergencyContact: { fullName: "Naima Gharbi", relation: "Mère", phone: "+216 22 000 302" },
      },
      economic: { monthlyIncomeTnd: 700, housing: "locataire", householdSize: 5 },
      schooling: {
        lastSchool: "Collège Mourouj 4",
        nominalGrade: 9,
        actualGrade: 7,
        subjects: [
          { subject: "Arabe", nominal: "9e", actual: "8e" },
          { subject: "Français", nominal: "9e", actual: "6e" },
          { subject: "Mathématiques", nominal: "9e", actual: "7e" },
        ],
      },
      health: {
        bloodGroup: "B+",
        allergies: [],
        chronicConditions: [],
        treatments: [],
        disability: null,
        vaccinationUpToDate: false,
        doctor: "Centre de santé de base Mourouj",
      },
      legal: {
        hasMeasure: true,
        measures: [
          {
            type: "Placement en centre de rééducation",
            authority: "Juge des enfants, Ben Arous",
            startDate: monthsAgo(10, 1),
            endDate: monthsAgo(4, 1),
            center: "Centre de rééducation de Mghira",
            ongoingFollowUp: true,
          },
        ],
      },
      interests: {
        hobbies: ["Musique (rap)", "Football"],
        interests: ["Cuisine"],
        skillsToDevelop: ["Gestion de la colère", "Travail en équipe"],
        wishes: "Avoir un vrai travail et ne plus avoir d'histoires.",
      },
      mood: {
        level: 2,
        updatedAt: at(daysAgo(6), 10),
        updatedBy: "u-psy",
        history: moodHistory([2, 3, 2]),
      },
      consent: { given: true, by: "Lotfi Gharbi (père)", date: monthsAgo(3, 2) },
      assigned: { ...DEFAULT_ASSIGNMENTS },
    },

    // ── Phase 4
    {
      id: "c-nour",
      code: "TUN-2025-087",
      poleId: "pole-tunis",
      identity: {
        firstName: "Nour",
        lastName: "Mejri",
        birthDate: yearsAgo(17, 3, 11),
        sex: "F",
        gouvernorat: "Manouba",
        address: "Douar Hicher, Manouba",
        language: "Arabe tunisien, français",
        avatarSeed: "nour-mejri",
      },
      journey: {
        phase: 4,
        phaseHistory: [
          { phase: 1, enteredAt: monthsAgo(13, 4), stayId: "s-nou-1" },
          { phase: 2, enteredAt: monthsAgo(12, 10), stayId: "s-nou-1" },
          { phase: 3, enteredAt: monthsAgo(10, 2), stayId: "s-nou-1" },
          { phase: 4, enteredAt: monthsAgo(2, 15), stayId: "s-nou-1" },
        ],
        status: "present",
        entryDate: monthsAgo(13, 4),
        referredBy: "famille",
        stays: [{ id: "s-nou-1", entryDate: monthsAgo(13, 4), exitDate: null, exitDestination: null }],
      },
      family: {
        father: { fullName: "Riadh Mejri", alive: true, profession: "Sans emploi", phone: "+216 22 000 401" },
        mother: { fullName: "Saloua Mejri", alive: true, profession: "Vendeuse", phone: "+216 22 000 402" },
        guardian: { fullName: "Saloua Mejri", relation: "Mère", phone: "+216 22 000 402" },
        siblings: [{ firstName: "Ines", age: 20, sex: "F" }],
        emergencyContact: { fullName: "Ines Mejri", relation: "Sœur", phone: "+216 22 000 403" },
      },
      economic: { monthlyIncomeTnd: 520, housing: "locataire", householdSize: 4 },
      schooling: {
        lastSchool: "Lycée Douar Hicher",
        nominalGrade: 10,
        actualGrade: 9,
        subjects: [
          { subject: "Arabe", nominal: "1re sec.", actual: "1re sec." },
          { subject: "Français", nominal: "1re sec.", actual: "9e" },
          { subject: "Mathématiques", nominal: "1re sec.", actual: "8e" },
        ],
      },
      health: {
        bloodGroup: "A-",
        allergies: [],
        chronicConditions: [],
        treatments: [],
        disability: null,
        vaccinationUpToDate: true,
        doctor: "Dr Anis Belhaj, Manouba",
      },
      legal: noMeasure,
      interests: {
        hobbies: ["Pâtisserie", "Réseaux sociaux"],
        interests: ["Esthétique", "Pâtisserie"],
        skillsToDevelop: ["Calcul", "Ponctualité"],
        wishes: "Ouvrir un petit salon de pâtisserie avec ma sœur.",
      },
      mood: {
        level: 4,
        updatedAt: at(daysAgo(8), 14),
        updatedBy: "u-psy",
        history: moodHistory([2, 3, 3, 4, 4, 4]),
      },
      consent: { given: true, by: "Saloua Mejri (mère)", date: monthsAgo(13, 4) },
      assigned: { ...DEFAULT_ASSIGNMENTS },
    },

    // ── Phase 5 — insertion en cours (formation)
    {
      id: "c-skander",
      code: "TUN-2025-041",
      poleId: "pole-tunis",
      identity: {
        firstName: "Skander",
        lastName: "Hammami",
        birthDate: yearsAgo(17, 8, 30),
        sex: "M",
        gouvernorat: "Tunis",
        address: "Sidi Hassine, Tunis",
        language: "Arabe tunisien",
        avatarSeed: "skander-hammami",
      },
      journey: {
        phase: 5,
        phaseHistory: [
          { phase: 1, enteredAt: monthsAgo(18, 6), stayId: "s-ska-1" },
          { phase: 2, enteredAt: monthsAgo(17, 12), stayId: "s-ska-1" },
          { phase: 3, enteredAt: monthsAgo(15, 1), stayId: "s-ska-1" },
          { phase: 4, enteredAt: monthsAgo(7, 9), stayId: "s-ska-1" },
          { phase: 5, enteredAt: monthsAgo(1, 4), stayId: "s-ska-1" },
        ],
        status: "present",
        entryDate: monthsAgo(18, 6),
        referredBy: "association",
        stays: [{ id: "s-ska-1", entryDate: monthsAgo(18, 6), exitDate: null, exitDestination: null }],
      },
      family: {
        father: { fullName: "Mohamed Hammami", alive: true, profession: "Mécanicien", phone: "+216 22 000 501" },
        mother: { fullName: "Latifa Hammami", alive: true, profession: "Ouvrière textile", phone: "+216 22 000 502" },
        guardian: { fullName: "Mohamed Hammami", relation: "Père", phone: "+216 22 000 501" },
        siblings: [],
        emergencyContact: { fullName: "Latifa Hammami", relation: "Mère", phone: "+216 22 000 502" },
      },
      economic: { monthlyIncomeTnd: 900, housing: "locataire", householdSize: 3 },
      schooling: {
        lastSchool: "Collège technique Sidi Hassine",
        nominalGrade: 9,
        actualGrade: 9,
        subjects: [],
      },
      health: {
        bloodGroup: "O-",
        allergies: [],
        chronicConditions: [],
        treatments: [],
        disability: null,
        vaccinationUpToDate: true,
        doctor: "Centre de santé de base Sidi Hassine",
      },
      legal: noMeasure,
      interests: {
        hobbies: ["Vélo", "Jeux vidéo"],
        interests: ["Mécanique automobile"],
        skillsToDevelop: ["Autonomie", "Gestion du budget"],
        wishes: "Finir ma formation et travailler au garage de mon père.",
      },
      mood: {
        level: 5,
        updatedAt: at(daysAgo(14), 9),
        updatedBy: "u-psy",
        history: moodHistory([3, 4, 4, 4, 5, 5]),
      },
      consent: { given: true, by: "Mohamed Hammami (père)", date: monthsAgo(18, 6) },
      assigned: { ...DEFAULT_ASSIGNMENTS },
    },

    // ── Phase 2 — revenue au centre après une sortie en famille
    {
      id: "c-rania",
      code: "TUN-2025-063",
      poleId: "pole-tunis",
      identity: {
        firstName: "Rania",
        lastName: "Chaabane",
        birthDate: yearsAgo(13, 10, 5),
        sex: "F",
        gouvernorat: "Tunis",
        address: "El Kabaria, Tunis",
        language: "Arabe tunisien",
        avatarSeed: "rania-chaabane",
      },
      journey: {
        phase: 2,
        phaseHistory: [
          { phase: 1, enteredAt: monthsAgo(14, 7), stayId: "s-ran-1" },
          { phase: 2, enteredAt: monthsAgo(13, 15), stayId: "s-ran-1" },
          { phase: 3, enteredAt: monthsAgo(11, 20), stayId: "s-ran-1" },
          { phase: 1, enteredAt: monthsAgo(1, 9), stayId: "s-ran-2" },
          { phase: 2, enteredAt: daysAgo(9), stayId: "s-ran-2" },
        ],
        status: "present",
        entryDate: monthsAgo(1, 9),
        referredBy: "delegue_protection",
        stays: [
          { id: "s-ran-1", entryDate: monthsAgo(14, 7), exitDate: monthsAgo(6, 28), exitDestination: "famille" },
          { id: "s-ran-2", entryDate: monthsAgo(1, 9), exitDate: null, exitDestination: null },
        ],
      },
      family: {
        father: { fullName: "Adel Chaabane", alive: true, profession: "Inconnu", phone: null },
        mother: { fullName: "Monia Chaabane", alive: true, profession: "Aide ménagère", phone: "+216 22 000 601" },
        guardian: { fullName: "Monia Chaabane", relation: "Mère", phone: "+216 22 000 601" },
        siblings: [
          { firstName: "Salma", age: 16, sex: "F" },
          { firstName: "Wael", age: 10, sex: "M" },
          { firstName: "Malek", age: 4, sex: "M" },
        ],
        emergencyContact: { fullName: "Rachida Ben Amor", relation: "Grand-mère", phone: "+216 22 000 602" },
      },
      economic: { monthlyIncomeTnd: 300, housing: "precaire", householdSize: 5 },
      schooling: {
        lastSchool: "École primaire El Kabaria",
        nominalGrade: 7,
        actualGrade: 5,
        subjects: [
          { subject: "Arabe", nominal: "7e", actual: "5e" },
          { subject: "Français", nominal: "7e", actual: "4e" },
          { subject: "Mathématiques", nominal: "7e", actual: "5e" },
        ],
      },
      health: {
        bloodGroup: "B-",
        allergies: ["Arachides"],
        chronicConditions: [],
        treatments: [],
        disability: null,
        vaccinationUpToDate: true,
        doctor: "Centre de santé de base El Kabaria",
      },
      legal: noMeasure,
      interests: {
        hobbies: ["Chant", "Danse"],
        interests: ["Coiffure", "Animaux"],
        skillsToDevelop: ["Lecture", "Confiance en soi"],
        wishes: "Rester près de mon petit frère Malek et apprendre un métier.",
      },
      mood: {
        level: 2,
        updatedAt: at(daysAgo(4), 16),
        updatedBy: "u-psy",
        history: moodHistory([3, 3, 2, 2, 3, 2]),
      },
      consent: { given: true, by: "Monia Chaabane (mère)", date: monthsAgo(1, 9) },
      assigned: { ...DEFAULT_ASSIGNMENTS },
    },
  ]
}

// ═════════════════════════════════════════════════════════════ 3. Séances à 3 sorties (note privée, note partagée, note pour l'IA)

export interface SeanceSpec {
  id: string
  childId: string
  role: ProfessionalRole
  date: ISODate
  details: SessionDetails
  privateNote?: string
  shared?: { text: string; to: { role: ProfessionalRole; readDaysAgo: number | null }[] }
  ai?: { text: string; consumed?: string }
}

const scales = (humeur: number, anxiete: number, confiance: number, colere: number, relations: number, motivation: number) =>
  ({ humeur, anxiete, confiance, colere, relations, motivation }) as MoodScales

export function donneesSeances(): SeanceSpec[] {
  return [
    // ── Yassine
    {
      id: "se-yas-1",
      childId: "c-yassine",
      role: "psychologue",
      date: daysAgo(38),
      details: { kind: "consultation", durationMin: 45, type: "suivi", scales: scales(2, 4, 2, 3, 3, 3) },
      privateNote: "Piste à explorer : relation avec le grand frère.",
      shared: { text: "Yassine est fatigué en ce moment, privilégier les activités pratiques.", to: [{ role: "educateur", readDaysAgo: 37 }] },
      ai: { text: "Besoin de valorisation ; s'investit quand il voit un résultat concret.", consumed: "init" },
    },
    {
      id: "se-yas-2",
      childId: "c-yassine",
      role: "educateur",
      date: daysAgo(20),
      details: { kind: "observation", context: "Atelier électricité", durationMin: 90, skillsObserved: ["Patience", "Travail en équipe"] },
      shared: {
        text: "Très appliqué à l'atelier, a aidé un camarade à câbler un interrupteur.",
        to: [
          { role: "psychologue", readDaysAgo: 19 },
          { role: "social", readDaysAgo: 18 },
        ],
      },
      ai: { text: "Très à l'aise dans les tâches manuelles, perd patience en lecture." },
    },
    {
      id: "se-yas-3",
      childId: "c-yassine",
      role: "psychologue",
      date: daysAgo(10),
      details: { kind: "consultation", durationMin: 50, type: "suivi", scales: scales(3, 3, 3, 3, 3, 4) },
      privateNote: "Évoque des tensions à la maison les week-ends.",
      ai: { text: "Motivation en hausse depuis l'atelier ; anxiété en baisse." },
    },
    {
      id: "se-yas-4",
      childId: "c-yassine",
      role: "social",
      date: daysAgo(15),
      details: {
        kind: "visite",
        location: "domicile",
        peopleMet: ["Samia Ben Salah (mère)", "Eya (sœur)"],
        livingConditions: "Logement de deux pièces, humide. Climat familial calme mais inquiet pour les revenus.",
      },
      shared: {
        text: "Dossier d'aide aux familles nécessiteuses déposé. La mère est très impliquée.",
        to: [{ role: "educateur", readDaysAgo: 14 }],
      },
      ai: { text: "Famille mobilisée ; revenus instables, dossier d'aide déposé." },
    },

    // Historique de consultations (6 mois) pour la courbe des échelles
    ...[170, 135, 100, 70].map(
      (d, i): SeanceSpec => ({
        id: `se-yas-h${i}`,
        childId: "c-yassine",
        role: "psychologue",
        date: daysAgo(d),
        details: {
          kind: "consultation",
          durationMin: 45,
          type: i === 0 ? "initiale" : "suivi",
          scales: [scales(2, 5, 1, 2, 2, 2), scales(2, 4, 2, 2, 3, 2), scales(3, 4, 2, 3, 3, 3), scales(2, 4, 2, 3, 3, 3)][i],
        },
        privateNote: ["Premier contact, très méfiant.", "Commence à parler de l'atelier.", "Bonne séance, plus détendu.", "Semaine difficile à la maison."][i],
      }),
    ),
    ...[160, 120, 80, 45].map(
      (d, i): SeanceSpec => ({
        id: `se-nou-h${i}`,
        childId: "c-nour",
        role: "psychologue",
        date: daysAgo(d),
        details: {
          kind: "consultation",
          durationMin: 45,
          type: "suivi",
          scales: [scales(3, 3, 2, 3, 3, 3), scales(3, 3, 3, 3, 4, 4), scales(4, 2, 3, 4, 4, 4), scales(4, 2, 4, 4, 4, 5)][i],
        },
        privateNote: ["Doute de ses capacités.", "Le projet pâtisserie la motive.", "Plus sereine en groupe.", "Prête pour le stage."][i],
      }),
    ),

    // ── Amira
    {
      id: "se-ami-1",
      childId: "c-amira",
      role: "psychologue",
      date: daysAgo(5),
      details: { kind: "consultation", durationMin: 60, type: "initiale", scales: scales(2, 4, 1, 3, 2, 2) },
      privateNote: "Deuil du père il y a un an, peu verbalisé.",
      shared: {
        text: "Amira est très réservée. Lui laisser du temps avant de la solliciter en groupe.",
        to: [
          { role: "educateur", readDaysAgo: null },
          { role: "social", readDaysAgo: 4 },
        ],
      },
      ai: { text: "Confiance en soi très basse ; apprécie les activités calmes (dessin)." },
    },
    {
      id: "se-ami-2",
      childId: "c-amira",
      role: "social",
      date: daysAgo(9),
      details: {
        kind: "visite",
        location: "centre",
        peopleMet: ["Hayet Trabelsi (mère)"],
        livingConditions: "Hébergées chez la tante depuis trois mois.",
      },
      shared: {
        text: "La mère cherche un logement. Amira dort mal depuis le déménagement.",
        to: [
          { role: "educateur", readDaysAgo: null },
          { role: "psychologue", readDaysAgo: 8 },
        ],
      },
    },

    // ── Hamza
    {
      id: "se-ham-1",
      childId: "c-hamza",
      role: "psychologue",
      date: daysAgo(6),
      details: { kind: "consultation", durationMin: 40, type: "crise", scales: scales(2, 3, 2, 1, 2, 2) },
      privateNote: "Conflit avec un ancien camarade de Mghira.",
      shared: {
        text: "Hamza traverse une période tendue. Éviter les confrontations devant le groupe, proposer un temps calme.",
        to: [{ role: "educateur", readDaysAgo: null }],
      },
      ai: {
        text: "Gestion de la colère fragile en ce moment ; réagit bien quand on lui donne une responsabilité.",
        consumed: "pr-ham-psy",
      },
    },
    {
      id: "se-ham-2",
      childId: "c-hamza",
      role: "educateur",
      date: daysAgo(3),
      details: { kind: "observation", context: "Atelier cuisine", durationMin: 120, skillsObserved: ["Respect des consignes"] },
      ai: { text: "Très motivé en cuisine, respecte les consignes d'hygiène." },
    },

    // ── Nour
    {
      id: "se-nou-1",
      childId: "c-nour",
      role: "educateur",
      date: daysAgo(4),
      details: { kind: "observation", context: "Stage découverte en pâtisserie", durationMin: 240, skillsObserved: ["Ponctualité", "Autonomie"] },
      shared: {
        text: "Retour très positif du pâtissier : ponctuelle toute la semaine.",
        to: [
          { role: "psychologue", readDaysAgo: null },
          { role: "social", readDaysAgo: null },
        ],
      },
      ai: { text: "Ponctualité acquise ; difficultés persistantes sur les calculs de proportions.", consumed: "pr-nou-edu" },
    },
    {
      id: "se-nou-2",
      childId: "c-nour",
      role: "psychologue",
      date: daysAgo(8),
      details: { kind: "consultation", durationMin: 45, type: "suivi", scales: scales(4, 2, 4, 4, 4, 5) },
      ai: { text: "Confiance en soi en nette progression." },
    },

    // ── Skander
    {
      id: "se-ska-1",
      childId: "c-skander",
      role: "social",
      date: daysAgo(11),
      details: {
        kind: "visite",
        location: "domicile",
        peopleMet: ["Mohamed Hammami (père)"],
        livingConditions: "Logement stable. Le père propose d'accueillir Skander au garage après la formation.",
      },
      shared: {
        text: "Le père confirme une place au garage à la fin de la formation.",
        to: [
          { role: "educateur", readDaysAgo: 10 },
          { role: "psychologue", readDaysAgo: 9 },
        ],
      },
      ai: { text: "Projet d'insertion soutenu par la famille." },
    },

    // ── Rania
    {
      id: "se-ran-1",
      childId: "c-rania",
      role: "social",
      date: daysAgo(2),
      details: {
        kind: "visite",
        location: "domicile",
        peopleMet: ["Monia Chaabane (mère)", "Rachida Ben Amor (grand-mère)"],
        livingConditions: "Logement précaire, une seule pièce pour cinq personnes.",
      },
      privateNote: "Vérifier la situation du père avec le délégué.",
      shared: {
        text: "Retour en famille impossible pour l'instant. La grand-mère peut accueillir Rania le week-end.",
        to: [
          { role: "educateur", readDaysAgo: null },
          { role: "psychologue", readDaysAgo: null },
        ],
      },
      ai: { text: "Soutien de la grand-mère ; logement familial inadapté." },
    },
    {
      id: "se-ran-2",
      childId: "c-rania",
      role: "psychologue",
      date: daysAgo(4),
      details: { kind: "consultation", durationMin: 50, type: "suivi", scales: scales(2, 4, 2, 3, 3, 2) },
      shared: {
        text: "Rania vit son retour au centre comme un échec. Valoriser chaque petite réussite.",
        to: [{ role: "educateur", readDaysAgo: 3 }],
      },
      ai: { text: "Sentiment d'échec lié au retour ; besoin de repères stables." },
    },
  ]
}

// ═════════════════════════════════════════════════════════════ 4. Roadmaps initiales (version 1, validée par chaque responsable) et propositions en attente

export interface RoadmapSpec {
  childId: string
  objective: string
  careerTrack: string
  progressPercent: number
  validatedAt: ISODateTime
  education: EducationContent
  psy: PsychologicalContent
  social: SocialContent
}

export function donneesRoadmaps(): RoadmapSpec[] {
  return [
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
  ]
}

/** Propositions de l'IA déjà en attente au démarrage de la démo (appliquées aux roadmaps construites). */
export function propositionsEnAttente(roadmaps: Roadmap[]): void {
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
}

// ═════════════════════════════════════════════════════════════ 5. Présence, planning d'activités, aides de l'État, notifications

/** Taux d'absence par enfant et absences forcées (jours avant aujourd'hui) pour alimenter les alertes. */
export const ABSENCE_RATE: Record<string, number> = {
  "c-yassine": 0.06,
  "c-amira": 0.08,
  "c-hamza": 0.15,
  "c-nour": 0.04,
  "c-skander": 0.02,
  "c-rania": 0.1,
}

/** Absences récentes forcées (jours avant aujourd'hui) pour alimenter les alertes. */
export const FORCED_ABSENCES: Record<string, number[]> = {
  "c-hamza": [1, 2, 4],
  "c-rania": [3],
}

export const REASONS = ["Rendez-vous médical", "Convocation au tribunal", "Événement familial"]

export function donneesActivites(): Activity[] {
  const a = (id: string, childId: string, weekday: Activity["weekday"], start: string, end: string, title: string, objective: string): Activity => ({
    id,
    childId,
    weekday,
    start,
    end,
    title,
    objective,
    weekStart: null,
  })
  return [
    a("a-yas-1", "c-yassine", 2, "10:00", "12:00", "Atelier électricité", "Travailler la patience"),
    a("a-yas-2", "c-yassine", 4, "10:00", "12:00", "Atelier électricité", "Lire un schéma simple"),
    a("a-yas-3", "c-yassine", 3, "14:00", "15:00", "Soutien en lecture", "Lecture à voix haute"),
    a("a-yas-4", "c-yassine", 6, "09:30", "11:00", "Football", "Respect des règles collectives"),
    a("a-ami-1", "c-amira", 1, "14:00", "15:30", "Atelier dessin", "S'exprimer autrement qu'à l'oral"),
    a("a-ami-2", "c-amira", 3, "10:00", "11:00", "Évaluation scolaire", "Situer le niveau réel"),
    a("a-ham-1", "c-hamza", 1, "10:00", "12:00", "Atelier cuisine", "Assumer une responsabilité dans l'équipe"),
    a("a-ham-2", "c-hamza", 3, "10:00", "12:00", "Atelier cuisine", "Respect des consignes"),
    a("a-ham-3", "c-hamza", 5, "14:00", "15:00", "Remise à niveau en français", "Écrire une recette"),
    a("a-nou-1", "c-nour", 2, "08:00", "13:00", "Stage pâtisserie", "Ponctualité et gestes professionnels"),
    a("a-nou-2", "c-nour", 4, "14:00", "15:00", "Soutien en calcul", "Proportions et conversions"),
    a("a-ska-1", "c-skander", 1, "08:00", "16:00", "Formation mécanique", "Suivi de la formation"),
    a("a-ran-1", "c-rania", 2, "14:00", "15:00", "Soutien en lecture", "Lire une courte histoire"),
    a("a-ran-2", "c-rania", 5, "10:00", "11:30", "Atelier chant", "Reprendre confiance en groupe"),
  ]
}

export const AID_PROGRAMS: AidProgram[] = [
  { id: "aid-pnafn", label: "Aide aux familles nécessiteuses" },
  { id: "aid-amg1", label: "Carte de soins gratuits" },
  { id: "aid-amg2", label: "Carte de soins à tarif réduit" },
  { id: "aid-rentree", label: "Aide à la rentrée scolaire" },
]

export function donneesDemandesAides(): AidApplication[] {
  return [
    {
      id: "ap-yas-1",
      childId: "c-yassine",
      programId: "aid-pnafn",
      beneficiary: "famille",
      status: "depose",
      submittedAt: daysAgo(15),
      decidedAt: null,
      missingDocuments: "",
    },
    {
      id: "ap-nou-1",
      childId: "c-nour",
      programId: "aid-rentree",
      beneficiary: "enfant",
      status: "accorde",
      submittedAt: daysAgo(80),
      decidedAt: daysAgo(50),
      missingDocuments: "",
    },
    {
      id: "ap-ran-1",
      childId: "c-rania",
      programId: "aid-pnafn",
      beneficiary: "famille",
      status: "a_preparer",
      submittedAt: null,
      decidedAt: null,
      missingDocuments: "Certificat de résidence, bulletin de salaire de la mère",
    },
    {
      id: "ap-ham-1",
      childId: "c-hamza",
      programId: "aid-amg2",
      beneficiary: "famille",
      status: "refuse",
      submittedAt: daysAgo(70),
      decidedAt: daysAgo(30),
      missingDocuments: "",
    },
    {
      id: "ap-ami-1",
      childId: "c-amira",
      programId: "aid-amg1",
      beneficiary: "famille",
      status: "a_preparer",
      submittedAt: null,
      decidedAt: null,
      missingDocuments: "Attestation d'hébergement",
    },
  ]
}

export function donneesNotifications(): AppNotification[] {
  const n = (id: string, userId: string, kind: AppNotification["kind"], childId: string, d: number, read = false): AppNotification => ({
    id,
    userId,
    kind,
    childId,
    createdAt: at(daysAgo(d), 17),
    readAt: read ? at(daysAgo(d - 1 < 0 ? 0 : d - 1), 9) : null,
  })
  return [
    n("n-1", "u-edu", "note_recue", "c-amira", 5),
    n("n-2", "u-edu", "note_recue", "c-hamza", 6),
    n("n-3", "u-edu", "validation_attendue", "c-nour", 3),
    n("n-4", "u-edu", "absence", "c-hamza", 1),
    n("n-5", "u-psy", "validation_attendue", "c-hamza", 9),
    n("n-6", "u-psy", "note_recue", "c-nour", 4),
    n("n-7", "u-soc", "note_recue", "c-nour", 4),
    n("n-8", "u-soc", "note_recue", "c-amira", 5, true),
    n("n-9", "u-dir", "roadmap_mise_a_jour", "c-skander", 20, true),
  ]
}

// ═════════════════════════════════════════════════════════════ 6. Dossiers clos (anonymisés) et ouvertures passées des blocs sensibles

/** [entrée il y a n jours, sortie il y a n jours, destination] */
export const DOSSIERS_CLOS: [entryDaysAgo: number, exitDaysAgo: number, destination: ExitDestination][] = [
  [520, 300, "formation"],
  [500, 260, "famille"],
  [480, 230, "ecole"],
  [430, 200, "emploi"],
  [400, 170, "abandon"],
  [380, 140, "formation"],
  [340, 120, "ecole"],
  [300, 95, "autre_structure"],
  [290, 70, "formation"],
  [260, 50, "emploi"],
  [230, 25, "ecole"],
  [200, 12, "formation"],
  [180, 6, "famille"],
]

/** [qui, quel enfant, quel bloc, il y a n jours, heure] */
export const OUVERTURES_SENSIBLES: [userId: string, childId: string, action: AuditEntry["action"], days: number, hour: number][] = [
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

// ═════════════════════════════════════════════════════════════ 7. Exemples affichés par la page /styleguide
/** Contenus d'exemple du styleguide (servis par api.getStyleguideExamples) : aucun exemple n'est écrit dans la page. */
export function exemplesStyleguide() {
  return {
    enfant: { seed: "yassine-ben-salah", name: "Yassine", sex: "M" as const },
    intervenant: { seed: "leila-haddad", name: "Leila Haddad" },
    enTete: { title: "Dossier de Yassine Ben Salah", description: "15 ans · entré le 3 mars 2026" },
    carteScolarite: {
      lastSchool: "Collège Ibn Khaldoun, Tunis",
      nominal: "8e année de base",
      actual: "6e année de base",
      health: "Groupe sanguin O+, aucune allergie connue, carnet de vaccination à jour.",
    },
    chiffres: { followed: "6", insertion: "67 %", returned: "1", pending: "2", followedTrend: "+20 %", insertionTrendPts: -5 },
    notes: [
      {
        author: "Leila Haddad",
        authorSeed: "leila-haddad",
        role: "psychologue" as ProfessionalRole,
        text: "Yassine a mal dormi cette semaine, éviter les activités le matin.",
        session: "Consultation du 10 nov. 2026",
        sharedAt: at(daysAgo(2), 14),
      },
      {
        author: "Sami Ayari",
        authorSeed: "sami-ayari",
        role: "social" as ProfessionalRole,
        text: "La famille a obtenu l'aide aux familles nécessiteuses. Le père reprend un travail à mi-temps.",
        session: "Visite familiale du 6 nov. 2026",
        sharedAt: at(daysAgo(7), 10),
      },
    ],
    humeurs: [
      { seed: "amira-trabelsi", sex: "F" as const },
      { seed: "hamza-gharbi", sex: "M" as const },
      { seed: "rania-chaabane", sex: "F" as const },
      { seed: "nour-mejri", sex: "F" as const },
      { seed: "skander-hammami", sex: "M" as const },
    ],
    avatarVivant: {
      seed: "nour-mejri",
      name: "Nour",
      sex: "F" as const,
      interests: {
        hobbies: ["Pâtisserie", "Réseaux sociaux", "Danse"],
        interests: ["Esthétique", "Animaux"],
        skillsToDevelop: ["Calcul", "Ponctualité", "Confiance en soi"],
        wishes: "",
      },
    },
    route: {
      entryDate: daysAgo(240),
      returnDate: daysAgo(60),
      flags: [
        { part: "education" as const, label: "Évaluation scolaire initiale", date: daysAgo(150), reached: true },
        { part: "psychologique" as const, label: "Partie psychologique validée", date: daysAgo(20), reached: true },
        { part: "sociale" as const, label: "Relancer le dossier d'aide", date: daysAhead(20), reached: false },
        { part: "education" as const, label: "Visite du centre de formation", date: daysAhead(45), reached: false },
      ],
    },
  }
}
