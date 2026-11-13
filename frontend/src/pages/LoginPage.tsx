import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router"
import { AlertCircle, Clock, Eye, EyeOff, Info, Loader2 } from "lucide-react"
import { useAuth } from "@/auth/context"
import { consumeLogoutReason } from "@/auth/logoutReason"
import { RoleBadge } from "@/components/cdis"
import { LoginIllustration } from "@/components/shell/LoginIllustration"
import { Logo } from "@/components/shell/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useT } from "@/i18n/context"
import { homePathFor } from "@/lib/access"
import type { Role } from "@/types"

/** Comptes de démonstration (identifiants publics du POC ; aucune donnée de mocks importée ici). */
const DEMO_ACCOUNTS: { username: string; role: Role }[] = [
  { username: "educateur", role: "educateur" },
  { username: "psy", role: "psychologue" },
  { username: "social", role: "social" },
  { username: "directeur", role: "directeur" },
]
const DEMO_PASSWORD = "demo"

export function LoginPage() {
  const t = useT()
  const { user, login, initializing } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reason] = useState(() => consumeLogoutReason())

  if (!initializing && user) return <Navigate to={homePathFor(user.role)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(false)
    try {
      const u = await login(username, password)
      navigate(homePathFor(u.role), { replace: true })
    } catch {
      setError(true)
      setSubmitting(false)
    }
  }

  const prefill = (account: string) => {
    setUsername(account)
    setPassword(DEMO_PASSWORD)
    setError(false)
    document.getElementById("login-submit")?.focus()
  }

  const errorProps = {
    "aria-invalid": error || undefined,
    "aria-describedby": error ? "login-error" : undefined,
  }

  return (
    <div className="grid min-h-dvh bg-sand lg:grid-cols-2">
      {/* ── Illustration (grand écran uniquement) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-e border-line bg-surface p-12 lg:flex">
        <Logo />
        <LoginIllustration className="mx-auto w-full max-w-md" />
        <div>
          <p className="text-3xl font-semibold tracking-tight text-ink">{t.auth.heroTitle}</p>
          <p className="mt-2 text-lg text-ink-muted">{t.auth.heroTagline}</p>
        </div>
      </aside>

      {/* ── Formulaire */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <Logo />
            <p className="text-sm text-ink-muted">{t.auth.heroTagline}</p>
          </div>

          <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
            <h1 className="text-2xl font-semibold text-ink">{t.auth.title}</h1>
            <p className="mt-1 text-base text-ink-muted">{t.auth.subtitle}</p>

            {reason === "inactivity" && (
              <p role="status" className="mt-5 flex gap-2 rounded-lg bg-teal-soft p-3 text-sm text-ink">
                <Clock className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                {t.auth.expired}
              </p>
            )}

            <form onSubmit={submit} className="mt-6 flex flex-col gap-5" noValidate aria-busy={submitting}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">{t.auth.username}</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  {...errorProps}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">{t.auth.password}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pe-12"
                    {...errorProps}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                    aria-pressed={showPassword}
                    aria-controls="password"
                    className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-e-lg text-ink-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                  </button>
                </div>
              </div>

              {error && (
                <p id="login-error" role="alert" className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertCircle className="size-4 shrink-0" aria-hidden />
                  {t.auth.error}
                </p>
              )}

              <Button id="login-submit" type="submit" size="lg" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="size-5 animate-spin" aria-hidden />}
                {submitting ? t.auth.submitting : t.auth.submit}
              </Button>
            </form>

            <p className="mt-5 flex gap-2 text-sm text-ink-muted">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {t.auth.noSignup} {t.auth.sharedComputer}
              </span>
            </p>
          </div>

          {/* Raccourcis de démonstration (POC uniquement) */}
          <section aria-labelledby="demo-accounts" className="mt-6 rounded-card border border-dashed border-line p-5">
            <h2 id="demo-accounts" className="text-sm font-semibold text-ink">
              {t.auth.demoAccounts}
            </h2>
            <p className="text-xs text-ink-muted">{t.auth.demoHint}</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.username}>
                  <button
                    type="button"
                    onClick={() => prefill(a.username)}
                    aria-pressed={username === a.username}
                    className="flex w-full flex-col items-start gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-start transition-colors hover:border-teal aria-pressed:border-teal aria-pressed:bg-teal-soft"
                  >
                    <span className="font-mono text-sm text-ink">{a.username}</span>
                    <RoleBadge role={a.role} plain className="h-auto font-normal text-ink-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
