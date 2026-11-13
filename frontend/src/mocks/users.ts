// Données FICTIVES. Toute ressemblance avec des personnes réelles serait fortuite.
import type { Pole, User } from "@/types"

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
