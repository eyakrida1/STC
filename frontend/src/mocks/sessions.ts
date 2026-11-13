// Données FICTIVES : séances à 3 sorties (note privée, note partagée, note pour l'IA).
import type { ISODate, MoodScales, ProfessionalRole, Session, SessionDetails } from "@/types"
import { at, daysAgo } from "./dates"

const AUTHOR: Record<ProfessionalRole, string> = { educateur: "u-edu", psychologue: "u-psy", social: "u-soc" }

interface Spec {
  id: string
  childId: string
  role: ProfessionalRole
  date: ISODate
  details: SessionDetails
  privateNote?: string
  shared?: { text: string; to: { role: ProfessionalRole; readDaysAgo: number | null }[] }
  ai?: { text: string; consumed?: string }
}

function make(s: Spec): Session {
  const createdAt = at(s.date, 16, 30)
  return {
    id: s.id,
    childId: s.childId,
    authorId: AUTHOR[s.role],
    authorRole: s.role,
    date: s.date,
    createdAt,
    updatedAt: null,
    details: s.details,
    privateNote: s.privateNote ?? null,
    sharedNote: s.shared
      ? {
          text: s.shared.text,
          sharedAt: createdAt,
          recipients: s.shared.to.map((r) => ({
            userId: AUTHOR[r.role],
            readAt: r.readDaysAgo === null ? null : at(daysAgo(r.readDaysAgo), 9),
          })),
        }
      : null,
    aiNote: s.ai ? { text: s.ai.text, consumedByProposalId: s.ai.consumed ?? null } : null,
  }
}

const scales = (humeur: number, anxiete: number, confiance: number, colere: number, relations: number, motivation: number) =>
  ({ humeur, anxiete, confiance, colere, relations, motivation }) as MoodScales

export function buildSessions(): Session[] {
  const specs: Spec[] = [
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
      (d, i): Spec => ({
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
      (d, i): Spec => ({
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
  return specs.map(make)
}
