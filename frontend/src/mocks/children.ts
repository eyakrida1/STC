// Données FICTIVES : 6 enfants du CDIS Tunis, 13 à 17 ans, répartis sur les 5 phases.
// Rania (c-rania) est revenue au centre après une première sortie.
import type { Child, MoodLevel } from "@/types"
import { at, daysAgo, monthsAgo, yearsAgo } from "./dates"
import { DEFAULT_ASSIGNMENTS } from "./users"

const moodHistory = (levels: MoodLevel[]) =>
  levels.map((level, i) => ({ date: monthsAgo(levels.length - 1 - i, 8), level }))

const noMeasure = { hasMeasure: false, measures: [] }

export function buildChildren(): Child[] {
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
