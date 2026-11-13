import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router"
import { AlertCircle, Clock, Info } from "lucide-react"
import { consumeLogoutReason } from "@/auth/logoutReason"
import { useAuth } from "@/auth/context"
import { RoleBadge } from "@/components/cdis"
import { Logo } from "@/components/shell/Logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useT } from "@/i18n/context"
import { homePathFor } from "@/lib/access"
import type { Role } from "@/types"

const DEMO_ACCOUNTS: { username: string; role: Role }[] = [
  { username: "educateur", role: "educateur" },
  { username: "psy", role: "psychologue" },
  { username: "social", role: "social" },
  { username: "directeur", role: "directeur" },
]

export function LoginPage() {
  const t = useT()
  const { user, login, initializing } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reason] = useState(() => consumeLogoutReason())

  if (!initializing && user) return <Navigate to={homePathFor(user.role)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
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

  return (
    <div className="grid min-h-dvh place-items-center bg-sand px-4 py-10">
      <main className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo />
          <p className="text-sm text-ink-muted">{t.app.tagline}</p>
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

          <form onSubmit={submit} className="mt-6 flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">{t.auth.username}</Label>
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={error || undefined}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error || undefined}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
            </div>

            {error && (
              <p id="login-error" role="alert" className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                {t.auth.error}
              </p>
            )}

            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? t.auth.submitting : t.auth.submit}
            </Button>
          </form>

          <p className="mt-5 flex gap-2 text-sm text-ink-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t.auth.noSignup} {t.auth.sharedComputer}
          </p>
        </div>

        {/* Raccourcis de démonstration (POC uniquement) */}
        <section aria-labelledby="demo-accounts" className="mt-6 rounded-card border border-dashed border-line p-5">
          <h2 id="demo-accounts" className="text-sm font-semibold text-ink">
            {t.auth.demoAccounts}
          </h2>
          <p className="text-xs text-ink-muted">{t.auth.demoHint}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.username}
                type="button"
                onClick={() => {
                  setUsername(a.username)
                  setPassword("demo")
                  setError(false)
                }}
                className="flex flex-col items-start gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-start hover:border-teal"
              >
                <span className="font-mono text-sm text-ink">{a.username}</span>
                <RoleBadge role={a.role} plain className="h-auto font-normal text-ink-muted" />
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
