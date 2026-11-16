// Avatars de démonstration générés LOCALEMENT (DiceBear, aucun appel réseau).
// En production, l'avatar enfant viendra d'un modèle installé sur le serveur du centre (la photo ne sort jamais).
import { createAvatar } from "@dicebear/core"
import { adventurer, notionists } from "@dicebear/collection"

const cache = new Map<string, string>()

/** Fonds doux et chaleureux pour les enfants (zone « pop » autorisée). */
const CHILD_BACKGROUNDS = ["ffe3dc", "fff1c2", "d9f1fd", "e6f2f1", "efe9f9"]

const range = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`)
const SHORT_HAIR = range("short", 19)
const LONG_HAIR = range("long", 26)

/** Expression par niveau d'humeur (variantes DiceBear « adventurer » choisies à l'œil). */
const MOOD_FACE: Record<number, { mouth: string[]; eyebrows: string[] }> = {
  1: { mouth: ["variant26"], eyebrows: ["variant03"] },
  2: { mouth: ["variant29"], eyebrows: ["variant09"] },
  3: { mouth: ["variant21"], eyebrows: ["variant10"] },
  4: { mouth: ["variant02"], eyebrows: ["variant12"] },
  5: { mouth: ["variant23"], eyebrows: ["variant15"] },
}

export function childAvatarUri(seed: string, sex?: "M" | "F", mood?: number): string {
  const key = `child:${seed}:${sex ?? ""}:${mood ?? ""}`
  let uri = cache.get(key)
  if (!uri) {
    const hair = sex === "M" ? SHORT_HAIR : sex === "F" ? LONG_HAIR : undefined
    uri = createAvatar(adventurer, {
      seed,
      backgroundColor: CHILD_BACKGROUNDS,
      radius: 50,
      ...(hair ? { hair: hair as never } : {}),
      ...(mood ? { mouth: MOOD_FACE[mood].mouth as never, eyebrows: MOOD_FACE[mood].eyebrows as never } : {}),
    }).toDataUri()
    cache.set(key, uri)
  }
  return uri
}

/** Portrait de l'enfant : `avatarUrl` (portrait stylisé du serveur) sinon avatar de démonstration local. */
export function childPortraitSrc(identity: { avatarUrl?: string | null; avatarSeed: string; sex?: "M" | "F" }, mood?: number): string {
  return identity.avatarUrl || childAvatarUri(identity.avatarSeed, identity.sex, mood)
}

/** « Photo » des intervenants : sobre. */
export function staffAvatarUri(seed: string): string {
  const key = `staff:${seed}`
  let uri = cache.get(key)
  if (!uri) {
    uri = createAvatar(notionists, { seed, backgroundColor: ["f3eee6"], radius: 50 }).toDataUri()
    cache.set(key, uri)
  }
  return uri
}
