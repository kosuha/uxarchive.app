import { CanvasPanel } from "@/components/canvas"
import { LeftPanel } from "@/components/left-panel"
import { PatternWorkspaceProvider } from "@/components/pattern-workspace/pattern-workspace-provider"

const spotlight = {
  service: "Dayflow",
  pattern: "Premium Upsell",
  summary: "구독 플랜 전환 시 결제 루프의 마찰을 줄이기 위한 멀티 인풋 캔버스",
  tags: ["Subscription", "Conversion", "Mobile"],
}

const insights = [
  {
    title: "Trial CTA 대비",
    note: '14일 무료가 마지막 단계에서 재강조되고, "정기 결제 알림"을 병기.',
  },
  {
    title: "옵션 정렬",
    note: "캘린더와 카드 입력을 수평으로 나눠 한 화면 내에서 완결.",
  },
  {
    title: "핀 라벨",
    note: "각 핀에 depth-indicator를 붙여 나중에 인사이트 리스트와 연결 예정.",
  },
]

export default function Home() {
  return (
    <PatternWorkspaceProvider>
      <LeftPanel />

      <CanvasPanel />

      <aside className="panel-column" data-panel="right">
        <div className="panel-scroll space-y-8">
          <section className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Current Pattern</p>
            <div className="space-y-1 rounded-2xl border border-border/70 bg-white/90 p-4 shadow-sm dark:bg-card">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{spotlight.service}</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground opacity-80" />
                <span>{spotlight.pattern}</span>
              </div>
              <h2 className="text-2xl font-semibold leading-tight">{spotlight.summary}</h2>
              <div className="flex flex-wrap gap-2 pt-3">
                {spotlight.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/80 px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Insights</p>
              <h3 className="text-xl font-semibold">Observation Stack</h3>
              <p className="text-sm text-muted-foreground">선택한 캡쳐에 남긴 메모가 여기에 정리됩니다.</p>
            </header>
            {insights.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-border/60 bg-white/80 p-4 shadow-sm dark:bg-card"
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <span>{item.title}</span>
                  <span className="text-[10px] text-primary">PIN</span>
                </div>
                <p className="pt-2 text-sm text-muted-foreground">{item.note}</p>
              </article>
            ))}
          </section>
        </div>
      </aside>
    </PatternWorkspaceProvider>
  )
}
