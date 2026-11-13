import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Camera, KeyRound, Loader2, Lock, RotateCcw, UserRound } from "lucide-react"
import { toast } from "sonner"
import * as api from "@/api"
import { useAuth, useCurrentUser } from "@/auth/context"
import { PageHeader, RoleBadge, SectionCard, TextField, UserAvatar } from "@/components/cdis"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useT } from "@/i18n/context"
import { fullName } from "@/lib/format"
import { isBlank, isFutureDate, isValidPhone, type Errors } from "@/lib/validation"
import type { ProfileUpdate } from "@/types"

/** Réduit une image à 256 px (carré recadré) pour la stocker légèrement. */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const size = 256
        const side = Math.min(img.width, img.height)
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("canvas"))
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

/** Mon profil : informations modifiables, champs gérés par l'administrateur, changement de mot de passe. */
export function ProfilePage() {
  const t = useT()
  const P = t.pages.profile
  const user = useCurrentUser()
  const { refreshUser } = useAuth()
  const [pole, setPole] = useState("")
  useEffect(() => {
    api.getMyPole().then((p) => setPole(p.name))
  }, [])

  return (
    <>
      <PageHeader title={P.title} description={P.description} leading={<UserAvatar seed={user.avatarSeed} photoUrl={user.photoUrl} name={fullName(user)} size="lg" />} />
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <InfoCard onSaved={refreshUser} />
        <div className="flex flex-col gap-6">
          <SectionCard title={P.admin} icon={Lock} description={P.lockedHint}>
            <dl className="grid gap-4">
              {(
                [
                  [P.role, <RoleBadge key="r" role={user.role} size="md" />],
                  [P.pole, pole],
                  [P.cin, <span key="c" className="font-mono">{user.cin}</span>],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3">
                  <div>
                    <dt className="text-sm text-ink-muted">{k}</dt>
                    <dd className="mt-0.5 text-base text-ink">{v}</dd>
                  </div>
                  <Tooltip>
                    <TooltipTrigger
                      render={<span tabIndex={0} />}
                      aria-label={`${k} : ${P.managedByAdmin}`}
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-ink-muted"
                    >
                      <Lock className="size-4" aria-hidden />
                    </TooltipTrigger>
                    <TooltipContent>{P.managedByAdmin}</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </dl>
          </SectionCard>
          <PasswordCard />
        </div>
      </div>
    </>
  )
}

function InfoCard({ onSaved }: { onSaved: () => Promise<void> }) {
  const t = useT()
  const P = t.pages.profile
  const C = t.pages.child.cards
  const user = useCurrentUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const ids = useId()
  const [d, setD] = useState<ProfileUpdate>({
    firstName: user.firstName,
    lastName: user.lastName,
    birthDate: user.birthDate,
    phone: user.phone,
    email: user.email,
    photoUrl: user.photoUrl ?? null,
  })
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [photoError, setPhotoError] = useState(false)
  const set = (p: Partial<ProfileUpdate>) => setD((x) => ({ ...x, ...p }))
  const photoChanged = d.photoUrl !== (user.photoUrl ?? null)

  const validate = (x: ProfileUpdate): Errors => ({
    firstName: isBlank(x.firstName) ? C.required : undefined,
    lastName: isBlank(x.lastName) ? C.required : undefined,
    birthDate: isBlank(x.birthDate) ? C.required : isFutureDate(x.birthDate) ? C.futureDate : undefined,
    phone: isBlank(x.phone) ? C.required : isValidPhone(x.phone) ? undefined : C.invalidPhone,
    email: isBlank(x.email) ? C.required : isEmail(x.email) ? undefined : P.invalidEmail,
  })
  const errors = submitted ? validate(d) : {}

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setPhotoError(false)
    try {
      if (!file.type.startsWith("image/")) throw new Error("type")
      set({ photoUrl: await resizeImage(file) })
    } catch {
      setPhotoError(true)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (Object.values(validate(d)).some(Boolean)) return
    setBusy(true)
    try {
      await api.updateMyProfile(d)
      await onSaved()
      toast.success(P.saved)
      setSubmitted(false)
    } catch {
      toast.error(P.saveError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard title={P.info} icon={UserRound}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-5">
          <UserAvatar seed={user.avatarSeed} photoUrl={d.photoUrl} name={P.photo} size="xl" className={photoChanged ? "ring-4 ring-teal/40" : undefined} />
          <div className="flex flex-col gap-2">
            <input ref={fileRef} id={`${ids}-photo`} type="file" accept="image/*" className="sr-only" onChange={pick} aria-describedby={`${ids}-photo-hint`} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <Camera data-icon="inline-start" aria-hidden />
              {P.changePhoto}
            </Button>
            {d.photoUrl && (
              <Button type="button" variant="ghost" onClick={() => set({ photoUrl: null })}>
                <RotateCcw data-icon="inline-start" aria-hidden />
                {P.removePhoto}
              </Button>
            )}
            <p id={`${ids}-photo-hint`} className="text-xs text-ink-muted">
              {photoChanged ? P.photoPreview : P.photoHint}
            </p>
            {photoError && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {P.photoError}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={P.firstName} value={d.firstName} onChange={(v) => set({ firstName: v })} error={errors.firstName} autoComplete="given-name" />
          <TextField label={P.lastName} value={d.lastName} onChange={(v) => set({ lastName: v })} error={errors.lastName} autoComplete="family-name" />
          <TextField label={P.birthDate} type="date" value={d.birthDate} onChange={(v) => set({ birthDate: v })} error={errors.birthDate} />
          <TextField label={P.phone} type="tel" inputMode="tel" value={d.phone} onChange={(v) => set({ phone: v })} error={errors.phone} autoComplete="tel" />
          <TextField className="sm:col-span-2" label={P.email} type="email" value={d.email} onChange={(v) => set({ email: v })} error={errors.email} autoComplete="email" />
        </div>
        <Button type="submit" className="w-fit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {P.save}
        </Button>
      </form>
    </SectionCard>
  )
}

function PasswordCard() {
  const t = useT()
  const W = t.pages.profile.password
  const C = t.pages.child.cards
  const [oldPw, setOldPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirm, setConfirm] = useState("")
  const [wrongOld, setWrongOld] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  const errors: Errors = submitted
    ? {
        old: isBlank(oldPw) ? C.required : wrongOld ? W.wrong : undefined,
        new: newPw.length < 10 ? W.tooShort : newPw === oldPw ? W.sameAsOld : undefined,
        confirm: confirm !== newPw ? W.mismatch : undefined,
      }
    : {}

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setWrongOld(false)
    if (isBlank(oldPw) || newPw.length < 10 || newPw === oldPw || confirm !== newPw) return
    setBusy(true)
    try {
      await api.changeMyPassword(oldPw, newPw)
      toast.success(W.done)
      setOldPw("")
      setNewPw("")
      setConfirm("")
      setSubmitted(false)
    } catch (err) {
      if (err instanceof api.ApiError && err.message === "wrong_password") setWrongOld(true)
      else toast.error(W.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard title={W.title} icon={KeyRound} description={W.hint}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label={W.old} type="password" value={oldPw} onChange={(v) => (setOldPw(v), setWrongOld(false))} error={errors.old} autoComplete="current-password" />
        <TextField
          label={W.new}
          type="password"
          value={newPw}
          onChange={setNewPw}
          error={errors.new}
          hint={W.strength(Math.min(newPw.length, 10))}
          autoComplete="new-password"
        />
        <TextField label={W.confirm} type="password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" />
        <Button type="submit" variant="outline" className="w-fit" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {W.submit}
        </Button>
      </form>
    </SectionCard>
  )
}
