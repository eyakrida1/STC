import { Construction } from "lucide-react"
import { EmptyState, PageHeader } from "@/components/cdis"
import { useT } from "@/i18n/context"

/** Page provisoire : les pages métier seront construites aux étapes suivantes. */
export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  const t = useT()
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState icon={Construction} title={t.pages.placeholder.title} description={t.pages.placeholder.text} />
      </div>
    </>
  )
}
