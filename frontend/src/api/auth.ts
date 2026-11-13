import type { ProfileUpdate, User } from "@/types"
import { ApiError, db, getSessionUserId, persist, requireUser, resetDemoSync, setSessionUserId, simulate } from "./client"

/** Connexion. Message d'erreur volontairement générique (ne dit pas quel champ est faux). */
export function login(username: string, password: string): Promise<User> {
  return simulate(() => {
    const key = username.trim().toLowerCase()
    const user = db().users.find((u) => u.username === key)
    if (!user || db().credentials[key] !== password) throw new ApiError("unauthorized")
    setSessionUserId(user.id)
    return user
  })
}

export function logout(): Promise<void> {
  return simulate(() => {
    setSessionUserId(null)
  })
}

/** Utilisateur de la session en cours, ou null. */
export function getCurrentUser(): Promise<User | null> {
  return simulate(() => {
    const id = getSessionUserId()
    return id ? (db().users.find((u) => u.id === id) ?? null) : null
  })
}

/** Mon profil : seuls photo, nom, prénom, date de naissance, téléphone et e-mail sont modifiables. */
export function updateMyProfile(update: ProfileUpdate): Promise<User> {
  return simulate(() => {
    const me = db().users.find((u) => u.id === requireUser().id)!
    me.firstName = update.firstName.trim()
    me.lastName = update.lastName.trim()
    me.birthDate = update.birthDate
    me.phone = update.phone.trim()
    me.email = update.email.trim()
    persist()
    return me
  })
}

export function changeMyPassword(oldPassword: string, newPassword: string): Promise<void> {
  return simulate(() => {
    const me = requireUser()
    if (db().credentials[me.username] !== oldPassword) throw new ApiError("invalid")
    if (newPassword.length < 4) throw new ApiError("invalid")
    db().credentials[me.username] = newPassword
    persist()
  })
}

/** Équipe du pôle (noms, rôles, photos) — sans données sensibles. */
export function listTeam(): Promise<Pick<User, "id" | "firstName" | "lastName" | "role" | "avatarSeed">[]> {
  return simulate(() => {
    const me = requireUser()
    return db()
      .users.filter((u) => u.poleId === me.poleId)
      .map(({ id, firstName, lastName, role, avatarSeed }) => ({ id, firstName, lastName, role, avatarSeed }))
  })
}

export function getMyPole() {
  return simulate(() => {
    const me = requireUser()
    return db().poles.find((p) => p.id === me.poleId)!
  })
}

/** Remet toutes les données de démonstration à zéro. */
export function resetDemo(): Promise<void> {
  return simulate(() => resetDemoSync())
}
