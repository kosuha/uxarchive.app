import { storageService } from "./storage"
import type { Capture, Folder, Insight, Pattern, Tag } from "./types"

const workspaceId = "workspace-default"

export const mockTags: Tag[] = [
  {
    id: "tag-service-fintech",
    label: "핀테크",
    type: "service-category",
    color: "#4f46e5",
  },
  {
    id: "tag-pattern-onboarding",
    label: "온보딩",
    type: "pattern-type",
    color: "#0ea5e9",
  },
  {
    id: "tag-pattern-payments",
    label: "결제 흐름",
    type: "pattern-type",
    color: "#f97316",
  },
  {
    id: "tag-custom-motion",
    label: "마이크로 인터랙션",
    type: "custom",
    color: "#a855f7",
  },
]

export const mockFolders: Folder[] = [
  {
    id: "folder-onboarding",
    workspaceId,
    name: "온보딩 & 가입",
    createdAt: "2024-01-12T09:00:00.000Z",
  },
  {
    id: "folder-payments",
    workspaceId,
    name: "결제 & 체크아웃",
    createdAt: "2024-02-04T09:00:00.000Z",
  },
  {
    id: "folder-payments-funnel",
    workspaceId,
    name: "체크아웃 퍼널",
    parentId: "folder-payments",
    createdAt: "2024-02-10T09:00:00.000Z",
  },
]

export const mockPatterns: Pattern[] = [
  {
    id: "pattern-seed-onboarding",
    folderId: "folder-onboarding",
    name: "네모뱅크 신규 가입",
    serviceName: "Nemo Bank",
    summary: "카드 스캐닝과 생체 인증 단계를 결합한 3단계 온보딩",
    tags: [mockTags[0], mockTags[1], mockTags[3]],
    author: "seonho.k",
    isFavorite: true,
    createdAt: "2024-03-18T04:12:00.000Z",
    updatedAt: "2024-03-19T10:22:00.000Z",
    captureCount: 2,
  },
  {
    id: "pattern-seed-checkout",
    folderId: "folder-payments",
    name: "스푼마켓 결제 플로우",
    serviceName: "Spoon Market",
    summary: "가상 카드와 페이 계정을 결합한 세그먼트별 결제",
    tags: [mockTags[0], mockTags[2]],
    author: "yeji.l",
    isFavorite: false,
    createdAt: "2024-04-02T06:05:00.000Z",
    updatedAt: "2024-04-03T12:45:00.000Z",
    captureCount: 3,
  },
  {
    id: "pattern-nested-express",
    folderId: "folder-payments-funnel",
    name: "익스프레스 결제 시나리오",
    serviceName: "Lemon Eats",
    summary: "체크아웃 퍼널 중간에 고정형 요약 패널을 배치해 이탈률을 줄임",
    tags: [mockTags[2], mockTags[3]],
    author: "mina.c",
    isFavorite: true,
    createdAt: "2024-04-10T08:22:00.000Z",
    updatedAt: "2024-04-11T11:02:00.000Z",
    captureCount: 1,
  },
]

export const mockCaptures: Capture[] = [
  {
    id: "capture-onboarding-1",
    patternId: "pattern-seed-onboarding",
    imageUrl: "/mock/captures/onboarding-step1.png",
    order: 1,
    createdAt: "2024-03-18T04:12:00.000Z",
  },
  {
    id: "capture-onboarding-2",
    patternId: "pattern-seed-onboarding",
    imageUrl: "/mock/captures/onboarding-step2.png",
    order: 2,
    createdAt: "2024-03-18T04:12:00.000Z",
  },
  {
    id: "capture-checkout-1",
    patternId: "pattern-seed-checkout",
    imageUrl: "/mock/captures/checkout-step1.png",
    order: 1,
    createdAt: "2024-04-02T06:05:00.000Z",
  },
  {
    id: "capture-checkout-2",
    patternId: "pattern-seed-checkout",
    imageUrl: "/mock/captures/checkout-step2.png",
    order: 2,
    createdAt: "2024-04-02T06:06:00.000Z",
  },
  {
    id: "capture-checkout-3",
    patternId: "pattern-seed-checkout",
    imageUrl: "/mock/captures/checkout-step3.png",
    order: 3,
    createdAt: "2024-04-02T06:07:00.000Z",
  },
]

export const mockInsights: Insight[] = [
  {
    id: "insight-onboarding-cta",
    captureId: "capture-onboarding-1",
    x: 42,
    y: 78,
    note: "CTA 버튼과 약관 링크 간격이 넉넉해져 접근성이 개선됨",
    createdAt: "2024-03-19T10:08:00.000Z",
  },
  {
    id: "insight-onboarding-biometrics",
    captureId: "capture-onboarding-2",
    x: 30,
    y: 40,
    note: "생체 인증 안내에 예시 이미지를 함께 사용해 신뢰도 향상",
    createdAt: "2024-03-19T10:15:00.000Z",
  },
  {
    id: "insight-checkout-summary",
    captureId: "capture-checkout-2",
    x: 65,
    y: 20,
    note: "요약 패널이 고정되어 있어 결제 중에도 비용 변화를 즉시 확인 가능",
    createdAt: "2024-04-03T08:02:00.000Z",
  },
]

let hasInitialized = false

const collectionIsEmpty = () =>
  storageService.patterns.getAll().length === 0 &&
  storageService.folders.getAll().length === 0 &&
  storageService.captures.getAll().length === 0 &&
  storageService.insights.getAll().length === 0 &&
  storageService.tags.getAll().length === 0

export const initMockDataStorage = (options?: { force?: boolean }) => {
  const { force = false } = options ?? {}
  if (hasInitialized && !force) return

  const shouldSeed = force || collectionIsEmpty()

  if (!shouldSeed) {
    hasInitialized = true
    return
  }

  storageService.tags.setAll(mockTags)
  storageService.folders.setAll(mockFolders)
  storageService.patterns.setAll(mockPatterns)
  storageService.captures.setAll(mockCaptures)
  storageService.insights.setAll(mockInsights)

  hasInitialized = true
}
