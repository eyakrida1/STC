// Bulles autour de l'avatar : hobbies, centres d'intérêt, compétences à développer (8 au maximum).
import {
  Bike,
  BookOpen,
  CakeSlice,
  Calculator,
  Car,
  ChefHat,
  Clock,
  Compass,
  Flame,
  Gamepad2,
  Goal,
  Hammer,
  Handshake,
  Heart,
  Hourglass,
  Lightbulb,
  Mic,
  Music,
  Palette,
  PawPrint,
  Scissors,
  Smartphone,
  Sparkles,
  Target,
  Users,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"
import type { Interests } from "@/types"

export type BubbleKind = "hobby" | "interest" | "skill"

export interface Bubble {
  kind: BubbleKind
  label: string
  icon: LucideIcon
}

export const MAX_BUBBLES = 8

/** Mots-clés → icône (minuscules, sans accents). Le premier qui correspond gagne. */
const KEYWORDS: [RegExp, LucideIcon][] = [
  [/electri/, Zap],
  [/moto|velo/, Bike],
  [/auto|voiture/, Car],
  [/meca/, Wrench],
  [/brico|maintenance/, Hammer],
  [/foot|sport|basket|hand/, Goal],
  [/chant|rap/, Mic],
  [/musi|danse/, Music],
  [/dessin|peint|art/, Palette],
  [/couture|coiff|esthet/, Scissors],
  [/patiss|gateau/, CakeSlice],
  [/cuisin/, ChefHat],
  [/lecture|lire|ecri/, BookOpen],
  [/calcul|math/, Calculator],
  [/patience/, Hourglass],
  [/ponctu/, Clock],
  [/confiance|estime/, Sparkles],
  [/colere/, Flame],
  [/equipe|groupe/, Users],
  [/relation|ami/, Handshake],
  [/jeu|video/, Gamepad2],
  [/reseau|telephone/, Smartphone],
  [/anima/, PawPrint],
  [/autonom/, Compass],
  [/budget|argent/, Wallet],
]

const FALLBACK: Record<BubbleKind, LucideIcon> = { hobby: Heart, interest: Lightbulb, skill: Target }

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

export function iconFor(label: string, kind: BubbleKind): LucideIcon {
  const n = normalize(label)
  return KEYWORDS.find(([re]) => re.test(n))?.[1] ?? FALLBACK[kind]
}

/** Alterne hobbies, intérêts et compétences pour garder de la variété, sans doublon, 8 au maximum. */
export function buildBubbles(interests: Interests): Bubble[] {
  const lists: [BubbleKind, string[]][] = [
    ["hobby", interests.hobbies],
    ["interest", interests.interests],
    ["skill", interests.skillsToDevelop],
  ]
  const out: Bubble[] = []
  const seen = new Set<string>()
  for (let i = 0; out.length < MAX_BUBBLES && lists.some(([, l]) => i < l.length); i++) {
    for (const [kind, list] of lists) {
      const label = list[i]?.trim()
      if (!label || seen.has(normalize(label)) || out.length >= MAX_BUBBLES) continue
      seen.add(normalize(label))
      out.push({ kind, label, icon: iconFor(label, kind) })
    }
  }
  return out
}
