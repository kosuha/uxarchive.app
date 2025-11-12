"use client"

import * as React from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"

import { TagBadge } from "@/components/tag-badge"
import { TagColorPicker } from "@/components/tag-color-picker"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { storageService } from "@/lib/storage"
import type { Tag } from "@/lib/types"
import { useStorageCollections } from "@/lib/use-storage-collections"
import { DEFAULT_TAG_COLOR, TAG_TYPE_LABELS, TAG_TYPE_OPTIONS } from "@/lib/tag-constants"
import { cn } from "@/lib/utils"

const TAG_SETTINGS_STATE_KEY = "uxarchive_tag_settings_view_state"

type TagSettingsViewState = {
  activeTagId: string | null
}

const defaultTagSettingsState: TagSettingsViewState = {
  activeTagId: null,
}

const readTagSettingsState = (): TagSettingsViewState => {
  if (typeof window === "undefined") {
    return { ...defaultTagSettingsState }
  }
  try {
    const raw = window.localStorage.getItem(TAG_SETTINGS_STATE_KEY)
    if (!raw) return { ...defaultTagSettingsState }
    const parsed = JSON.parse(raw) as Partial<TagSettingsViewState>
    return {
      ...defaultTagSettingsState,
      ...parsed,
    }
  } catch (error) {
    console.warn("[tagSettings] 상태 로드 실패", error)
    return { ...defaultTagSettingsState }
  }
}

const createTagId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `tag-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function TagSettingsView() {
  const { tags, patterns } = useStorageCollections()
  const [activeTagId, setActiveTagId] = React.useState<string | null>(() => readTagSettingsState().activeTagId)
  const tagRefs = React.useRef(new Map<string, HTMLButtonElement | null>())

  const sortedTags = React.useMemo(() => {
    return [...tags].sort((a, b) => a.label.localeCompare(b.label, "ko"))
  }, [tags])

  React.useEffect(() => {
    setActiveTagId((current) => {
      if (current && sortedTags.some((tag) => tag.id === current)) {
        return current
      }
      return sortedTags[0]?.id ?? null
    })
  }, [sortedTags])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const payload: TagSettingsViewState = { activeTagId }
      window.localStorage.setItem(TAG_SETTINGS_STATE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.error("[tagSettings] 상태 저장 실패", error)
    }
  }, [activeTagId])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TAG_SETTINGS_STATE_KEY) return
      const nextState = readTagSettingsState()
      setActiveTagId(nextState.activeTagId)
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const activeTag = React.useMemo(() => {
    return sortedTags.find((tag) => tag.id === activeTagId) ?? null
  }, [sortedTags, activeTagId])

  const registerTagRef = React.useCallback(
    (tagId: string) => (node: HTMLButtonElement | null) => {
      if (node) {
        tagRefs.current.set(tagId, node)
      } else {
        tagRefs.current.delete(tagId)
      }
    },
    []
  )

  React.useEffect(() => {
    if (!activeTagId) return
    const target = tagRefs.current.get(activeTagId)
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
  }, [activeTagId, sortedTags.length])

  const usageCountByTag = React.useMemo(() => {
    const countMap = new Map<string, number>()
    patterns.forEach((pattern) => {
      pattern.tags.forEach((tag) => {
        countMap.set(tag.id, (countMap.get(tag.id) ?? 0) + 1)
      })
    })
    return countMap
  }, [patterns])

  const handleCreateTag = () => {
    const newTag: Tag = {
      id: createTagId(),
      label: "새 태그",
      type: "custom",
      color: DEFAULT_TAG_COLOR,
    }
    storageService.tags.create(newTag)
    setActiveTagId(newTag.id)
  }

  const handleUpdateTag = <K extends keyof Tag>(key: K, value: Tag[K]) => {
    if (!activeTag) return

    const updatedTag = storageService.tags.update(activeTag.id, (current) => ({
      ...current,
      [key]: value,
    }))

    if (!updatedTag) return

    storageService.patterns.getAll().forEach((pattern) => {
      if (!pattern.tags.some((tag) => tag.id === updatedTag.id)) return

      storageService.patterns.update(pattern.id, (current) => ({
        ...current,
        tags: current.tags.map((tag) => (tag.id === updatedTag.id ? { ...tag, ...updatedTag } : tag)),
      }))
    })
  }

  const handleDeleteTag = () => {
    if (!activeTag) return
    const usageCount = usageCountByTag.get(activeTag.id) ?? 0
    const message = usageCount
      ? `이 태그는 ${usageCount}개의 패턴에서 사용 중입니다. 삭제할까요?`
      : "이 태그를 삭제할까요?"
    if (typeof window !== "undefined" && !window.confirm(message)) {
      return
    }
    storageService.tags.remove(activeTag.id)
    storageService.patterns.getAll().forEach((pattern) => {
      if (!pattern.tags.some((tag) => tag.id === activeTag.id)) return
      storageService.patterns.update(pattern.id, (current) => ({
        ...current,
        tags: current.tags.filter((tag) => tag.id !== activeTag.id),
      }))
    })
    setActiveTagId(null)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit Tag</p>
        </div>
      </div>
      <TagEditPanel
        tag={activeTag}
        usageCount={activeTag ? usageCountByTag.get(activeTag.id) ?? 0 : 0}
        onChange={handleUpdateTag}
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground uppercase">My Tags</div>
          <div>
            <Button variant="ghost" size="icon" onClick={handleCreateTag}>
              <Plus className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDeleteTag} aria-label="태그 삭제">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card">
          <ScrollArea className="h-[50vh] rounded-xl border border-border/60 bg-card">
            <div className="flex flex-wrap p-4">
              {sortedTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 등록된 태그가 없습니다.</p>
              ) : (
                sortedTags.map((tag) => {
                  const isActive = tag.id === activeTag?.id
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => setActiveTagId(tag.id)}
                      ref={registerTagRef(tag.id)}
                      className={cn(
                        "relative rounded-full border border-transparent p-1 transition focus-visible:outline-none"
                      )}
                    >
                      <TagBadge tag={tag} className="cursor-pointer" />
                      {isActive && (
                        <div className="absolute top-1.5 right-0.5 size-2 rounded-full bg-destructive z-[9999]" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

type TagEditPanelProps = {
  tag: Tag | null
  usageCount: number
  onChange: <K extends keyof Tag>(key: K, value: Tag[K]) => void
}

function TagEditPanel({ tag, usageCount, onChange }: TagEditPanelProps) {
  if (!tag) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        편집할 태그를 선택하거나 새 태그를 생성하세요.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="">
          <p className="text-xs text-muted-foreground">
            {`${usageCount}개 패턴에 연결됨`}
          </p>
        </div>
      </div>
      <div className="flex mt-4 gap-4">
        <div className="space-y-2">
          <Input
            value={tag.label}
            onChange={(event) => onChange("label", event.target.value)}
            placeholder="예: 온보딩"
          />
        </div>
        <div className="">
          <TagColorPicker color={tag.color ?? DEFAULT_TAG_COLOR} onChange={(value) => onChange("color", value)} />
        </div>
      </div>
    </div>
  )
}
