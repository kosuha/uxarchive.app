import type { Pattern } from "@/lib/types"

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

interface MetadataHeaderProps {
  pattern: Pattern | null
}

export const MetadataHeader = ({ pattern }: MetadataHeaderProps) => {
  if (!pattern) {
    return (
      <></>
    )
  }

  const updatedLabel = dateFormatter.format(new Date(pattern.updatedAt))

  return (
    <section className="space-y-4 rounded-3xl border border-border/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:bg-card">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{pattern.serviceName}</p>
          <h2 className="text-2xl font-semibold leading-tight">{pattern.name}</h2>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{pattern.author}</p>
          <p>업데이트 {updatedLabel}</p>
        </div>
      </header>

      <p className="text-sm text-muted-foreground">{pattern.summary}</p>

      <div className="flex flex-wrap gap-2 pt-2">
        {pattern.tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full border border-border/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            style={{
              borderColor: tag.color ?? undefined,
              color: tag.color ?? undefined,
            }}
          >
            {tag.label}
          </span>
        ))}
      </div>
    </section>
  )
}
