import { Link } from "react-router"
import { MapPinOff } from "lucide-react"
import { EmptyState } from "@/components/cdis"
import { buttonVariants } from "@/components/ui/button"
import { useT } from "@/i18n/context"

export function NotFoundPage() {
  const t = useT()
  return (
    <EmptyState
      icon={MapPinOff}
      title={t.pages.notFound.title}
      description={t.pages.notFound.text}
      className="mt-16"
      action={
        <Link to="/" className={buttonVariants()}>
          {t.pages.notFound.home}
        </Link>
      }
    />
  )
}
