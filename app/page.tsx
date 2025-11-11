import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { mockCaptures, mockFolders, mockPatterns } from "@/lib/mock-data"
import { FileText } from "lucide-react"

export default function Page() {
  const stats = [
    { label: "폴더", value: mockFolders.length, description: "워크스페이스 구조" },
    { label: "패턴", value: mockPatterns.length, description: "저장된 UX 사례" },
    { label: "캡처", value: mockCaptures.length, description: "세부 화면 이미지" },
  ]

  const featuredPatterns = mockPatterns

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">UX Archive</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>패턴 라이브러리</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <section className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
              >
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            ))}
          </section>
          <section className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="border-b px-5 py-4">
              <p className="text-sm font-semibold text-muted-foreground">
                최근 패턴
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                저장된 UX 패턴 목록
              </h2>
              <p className="text-sm text-muted-foreground">
                mock-data.ts에서 정의된 패턴 정보를 카드 형태로 확인할 수 있습니다.
              </p>
            </div>
            <div className="divide-y">
              {featuredPatterns.map((pattern) => (
                <article key={pattern.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-base font-semibold">
                      <FileText className="size-4 text-muted-foreground" />
                      {pattern.name}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {pattern.serviceName}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {pattern.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pattern.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          borderColor: tag.color,
                          color: tag.color,
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
