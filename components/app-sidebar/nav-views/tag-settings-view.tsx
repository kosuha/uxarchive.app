"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import { TagBadge } from "@/components/tag-badge"
import { TagColorPicker } from "@/components/tag-color-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Tag } from "@/lib/types"
import { useWorkspaceData } from "@/lib/workspace-data-context"
import { DEFAULT_TAG_COLOR } from "@/lib/tag-constants"
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
    console.warn("[tagSettings] failed to load state", error)
    return { ...defaultTagSettingsState }
  }
}

export function TagSettingsView() {
  const { tags, patterns, loading, error, mutations } = useWorkspaceData()
  const [activeTagId, setActiveTagId] = React.useState<string | null>(() => readTagSettingsState().activeTagId)
  const tagRefs = React.useRef(new Map<string, HTMLButtonElement | null>())
  const [deleteDialogState, setDeleteDialogState] = React.useState<{ tagId: string; usageCount: number } | null>(null)

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
      console.error("[tagSettings] failed to persist state", error)
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

  const handleCreateTag = async () => {
    try {
      const newTag = await mutations.createTag({ label: "New tag", type: "custom", color: DEFAULT_TAG_COLOR })
      setActiveTagId(newTag.id)
    } catch (mutationError) {
      console.error("Failed to create tag", mutationError)
    }
  }

  const handleUpdateTag = async <K extends keyof Tag>(key: K, value: Tag[K]) => {
    if (!activeTag) return
    try {
      await mutations.updateTag(activeTag.id, { [key]: value } as Partial<Tag>)
    } catch (mutationError) {
      console.error("Failed to update tag", mutationError)
    }
  }

  const handleRequestDeleteTag = () => {
    if (!activeTag) return
    const usageCount = usageCountByTag.get(activeTag.id) ?? 0
    setDeleteDialogState({ tagId: activeTag.id, usageCount })
  }

  const removeTagById = React.useCallback(
    async (tagId: string) => {
      try {
        await mutations.deleteTag(tagId)
        setActiveTagId((current) => (current === tagId ? null : current))
      } catch (mutationError) {
        console.error("Failed to delete tag", mutationError)
      }
    },
    [mutations]
  )

  const handleConfirmDeleteTag = React.useCallback(() => {
    if (!deleteDialogState) return
    removeTagById(deleteDialogState.tagId)
    setDeleteDialogState(null)
  }, [deleteDialogState, removeTagById])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading tag data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground">Edit Tag</p>
        </div>
      </div>
      <TagEditPanel
        tag={activeTag}
        usageCount={activeTag ? usageCountByTag.get(activeTag.id) ?? 0 : 0}
        onChange={handleUpdateTag}
        onPreview={(key, value) => {
          if (!activeTag) return
          if (key !== "label" && key !== "color") return
          mutations.previewTag(activeTag.id, { [key]: value } as Partial<Pick<Tag, "label" | "color">>)
        }}
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">My Tags</div>
          <div>
            <Button variant="ghost" size="icon" onClick={handleCreateTag}>
              <Plus className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRequestDeleteTag} aria-label="Delete tag">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card">
          <ScrollArea className="h-[50vh] rounded-xl border border-border/60 bg-card">
            <div className="flex flex-wrap p-4">
              {sortedTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags have been created yet.</p>
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
      <AlertDialog
        open={Boolean(deleteDialogState)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogState(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialogState?.usageCount
                ? `This tag is used by ${deleteDialogState.usageCount} patterns.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTag}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type TagEditPanelProps = {
  tag: Tag | null
  usageCount: number
  onChange: <K extends keyof Tag>(key: K, value: Tag[K]) => void
  onPreview: <K extends keyof Tag>(key: K, value: Tag[K]) => void
}

function TagEditPanel({ tag, usageCount, onChange, onPreview }: TagEditPanelProps) {
  if (!tag) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Select a tag to edit or create a new one.
      </div>
    )
  }

  return <TagEditPanelContent tag={tag} usageCount={usageCount} onChange={onChange} onPreview={onPreview} />
}

type TagEditPanelContentProps = {
  tag: Tag
  usageCount: number
  onChange: <K extends keyof Tag>(key: K, value: Tag[K]) => void
  onPreview: <K extends keyof Tag>(key: K, value: Tag[K]) => void
}

function TagEditPanelContent({ tag, usageCount, onChange, onPreview }: TagEditPanelContentProps) {
  const [labelValue, setLabelValue] = React.useState(tag.label)
  const [colorValue, setColorValue] = React.useState(tag.color ?? DEFAULT_TAG_COLOR)
  const debounceRefs = React.useRef<{ label?: number; color?: number }>({})
  type DebounceKey = keyof typeof debounceRefs.current

  const clearDebounce = React.useCallback((key: DebounceKey) => {
    const timeoutId = debounceRefs.current[key]
    if (typeof timeoutId !== "number") return
    window.clearTimeout(timeoutId)
    delete debounceRefs.current[key]
  }, [])

  const scheduleUpdate = React.useCallback(<K extends DebounceKey>(key: K, value: Tag[K]) => {
    clearDebounce(key)
    debounceRefs.current[key] = window.setTimeout(() => {
      onChange(key, value)
      delete debounceRefs.current[key]
    }, 2000)
  }, [clearDebounce, onChange])

  React.useEffect(() => {
    setLabelValue(tag.label)
    setColorValue(tag.color ?? DEFAULT_TAG_COLOR)
    clearDebounce("label")
    clearDebounce("color")
  }, [tag.id, tag.label, tag.color, clearDebounce])

  React.useEffect(() => {
    return () => {
      clearDebounce("label")
      clearDebounce("color")
    }
  }, [clearDebounce])

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="">
          <p className="text-xs text-muted-foreground">
            {`Linked to ${usageCount} patterns`}
          </p>
        </div>
      </div>
      <div className="flex mt-4 gap-4">
        <div className="space-y-2">
          <Input
            value={labelValue}
            onChange={(event) => {
              const next = event.target.value
              setLabelValue(next)
              onPreview("label", next)
              scheduleUpdate("label", next)
            }}
            placeholder="e.g., Onboarding"
          />
        </div>
        <div className="">
          <TagColorPicker
            color={colorValue}
            onChange={(value) => {
              setColorValue(value)
              onPreview("color", value)
              scheduleUpdate("color", value)
            }}
          />
        </div>
      </div>
    </div>
  )
}
