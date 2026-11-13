import { Loader2 } from "lucide-react"
import { useT } from "@/i18n/context"

export function FullPageLoader() {
  const t = useT()
  return (
    <div role="status" className="grid min-h-[50dvh] place-items-center text-ink-muted">
      <span className="inline-flex items-center gap-2 text-sm">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        {t.app.loading}
      </span>
    </div>
  )
}
