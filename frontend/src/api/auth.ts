import type { Pole, ProfileUpdate, User } from "@/types"
import { get, post, put, request } from "./client"

/** Connexion. Message d'erreur volontairement générique (ne dit pas quel champ est faux). */
export function login(username: string, password: string): Promise<User> {
  return request<User>("POST", "/auth/login", { username, password }, { silent401: true })
}

export function logout(): Promise<void> {
  return post<void>("/auth/logout")
}

/** Utilisateur de la session en cours, ou null. */
export function getCurrentUser(): Promise<User | null> {
  return get<User | null>("/auth/me")
}

/** Mon profil : seuls photo, nom, prénom, date de naissance, téléphone et e-mail sont modifiables. */
export function updateMyProfile(update: ProfileUpdate): Promise<User> {
  const { firstName, lastName, birthDate, phone, email, photoUrl } = update
  return put<User>("/me/profile", { firstName, lastName, birthDate, phone, email, photoUrl })
}

/** Erreurs : ApiError("invalid", "wrong_password" | "too_short"). */
export function changeMyPassword(oldPassword: string, newPassword: string): Promise<void> {
  return post<void>("/me/password", { oldPassword, newPassword })
}

/** Comptes de démonstration proposés sur la page de connexion (liste vide hors mode démo). */
export function listDemoAccounts(): Promise<{ username: string; role: User["role"]; password: string }[]> {
  return get("/demo/accounts")
}

/** Équipe du pôle (noms, rôles, photos) — sans données sensibles. */
export function listTeam(): Promise<Pick<User, "id" | "firstName" | "lastName" | "role" | "avatarSeed">[]> {
  return get("/team")
}

export function getMyPole(): Promise<Pole> {
  return get<Pole>("/pole")
}

/** Remet toutes les données de démonstration à zéro (mode démo du backend uniquement). */
export function resetDemo(): Promise<void> {
  return post<void>("/demo/reset")
}
