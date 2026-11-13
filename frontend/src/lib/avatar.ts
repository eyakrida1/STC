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

export function childAvatarUri(seed: string, sex?: "M" | "F"): string {
  const key = `child:${seed}:${sex ?? ""}`
  let uri = cache.get(key)
  if (!uri) {
    const hair = sex === "M" ? SHORT_HAIR : sex === "F" ? LONG_HAIR : undefined
    uri = createAvatar(adventurer, {
      seed,
      backgroundColor: CHILD_BACKGROUNDS,
      radius: 50,
      ...(hair ? { hair: hair as never } : {}),
    }).toDataUri()
    cache.set(key, uri)
  }
  return uri
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
