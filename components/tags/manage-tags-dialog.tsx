"use client"

import * as React from "react"
import { EllipsisVertical, Plus } from "lucide-react"

import { TagBadge } from "@/components/tag-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { TAG_LABEL_MAX_LENGTH } from "@/lib/field-limits"
import { DEFAULT_TAG_COLOR } from "@/lib/tag-constants"
import type { Tag, TagType } from "@/lib/types"
import { cn } from "@/lib/utils"

export const TAG_COLOR_PRESETS = [
  { color: "var(--tag-color-default)", name: "Default" },
  { color: "var(--tag-color-gray)", name: "Gray" },
  { color: "var(--tag-color-brown)", name: "Brown" },
  { color: "var(--tag-color-orange)", name: "Orange" },
  { color: "var(--tag-color-yellow)", name: "Yellow" },
  { color: "var(--tag-color-green)", name: "Green" },
  { color: "var(--tag-color-blue)", name: "Blue" },
  { color: "var(--tag-color-purple)", name: "Purple" },
  { color: "var(--tag-color-pink)", name: "Pink" },
  { color: "var(--tag-color-red)", name: "Red" },
]

export interface ManageTagsDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  
  // Data
  allTags: Tag[]
  assignedTags: Tag[]
  maxTags?: number
  
  // Actions
  onAssignTag: (tagId: string) => Promise<void> | void
  onRemoveTag: (tagId: string) => Promise<void> | void
  onCreateTag?: (
    input: { label: string; type: TagType; color: string | null },
    options?: { onOptimisticCreate?: (tag: Tag) => void; onConfirmedCreate?: (tag: Tag) => void }
  ) => Promise<Tag>
  onUpdateTag?: (tagId: string, updates: Partial<Pick<Tag, "label" | "type" | "color">>) => Promise<void> | void
  onDeleteTag?: (tagId: string) => Promise<void> | void
}

export function ManageTagsDialog({
  children,
  open: controlledOpen,
  onOpenChange,
  allTags,
  assignedTags,
  maxTags = 7,
  onAssignTag,
  onRemoveTag,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: ManageTagsDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const [tagSearch, setTagSearch] = React.useState("")
  const [isCreatingTag, setIsCreatingTag] = React.useState(false)
  const suppressSelectionRef = React.useRef(false)
  
  const [tagRenameDraft, setTagRenameDraft] = React.useState<{ id: string; value: string } | null>(null)
  const [tagRenameError, setTagRenameError] = React.useState<{ id: string; message: string } | null>(null)

  React.useEffect(() => {
    if (!isOpen) {
      setTagSearch("")
    }
  }, [isOpen])

  const sortedTags = React.useMemo(
    () => [...allTags].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allTags]
  )

  const normalizedTagSearch = tagSearch.trim().toLowerCase()

  const filteredTags = React.useMemo(() => {
    if (!normalizedTagSearch) return sortedTags
    return sortedTags.filter((tag) =>
      tag.label.toLowerCase().includes(normalizedTagSearch) ||
      tag.type.toLowerCase().includes(normalizedTagSearch)
    )
  }, [sortedTags, normalizedTagSearch])

  const canCreateTagOption = React.useMemo(() => {
    if (!onCreateTag) return false
    if (!normalizedTagSearch) return false
    return !sortedTags.some((tag) => tag.label.toLowerCase() === normalizedTagSearch)
  }, [normalizedTagSearch, onCreateTag, sortedTags])

  const handleToggleTag = React.useCallback(
    async (tagId: string) => {
      try {
        const hasTag = assignedTags.some((tag) => tag.id === tagId)
        if (hasTag) {
          await onRemoveTag(tagId)
          return
        }
        if (assignedTags.length >= maxTags) {
          return
        }
        const tagToAdd = sortedTags.find((tag) => tag.id === tagId)
        if (!tagToAdd) return
        await onAssignTag(tagId)
      } catch (error) {
        console.error("Failed to toggle tag", error)
      }
    },
    [assignedTags, maxTags, onAssignTag, onRemoveTag, sortedTags]
  )

  const handleAddTag = React.useCallback(
    async (tagId: string) => {
        const hasTag = assignedTags.some((tag) => tag.id === tagId)
        if (hasTag) return
        if (assignedTags.length >= maxTags) return
      try {
        await onAssignTag(tagId)
      } catch (error) {
        console.error("Failed to add tag", error)
      }
    },
    [assignedTags, maxTags, onAssignTag]
  )

  const handleCreateTag = React.useCallback(async (label: string) => {
    if (!onCreateTag) return
    const trimmed = label.trim()
    if (!trimmed) return
    setIsCreatingTag(true)
    try {
      const created = await onCreateTag({ label: trimmed, type: "custom", color: DEFAULT_TAG_COLOR })
      setTagSearch("")
      if (assignedTags.length < maxTags) {
        await onAssignTag(created.id)
      }
    } catch (error) {
      console.error("Failed to create tag", error)
    } finally {
      setIsCreatingTag(false)
    }
  }, [assignedTags.length, maxTags, onAssignTag, onCreateTag])

  const handleRenameTag = React.useCallback(async (tagId: string, value: string) => {
    if (!onUpdateTag) return
    const trimmed = value.trim()
    if (!trimmed) {
      setTagRenameError({ id: tagId, message: "Required" })
      return
    }
    const current = allTags.find((tag) => tag.id === tagId)
    if (current && current.label.trim() === trimmed) {
      setTagRenameDraft(null)
      setTagRenameError(null)
      return
    }
    const duplicate = allTags.some((tag) => tag.id !== tagId && tag.label.trim().toLowerCase() === trimmed.toLowerCase())
    if (duplicate) {
      setTagRenameError({ id: tagId, message: "Duplicate" })
      setTagRenameDraft(current ? { id: tagId, value: current.label } : null)
      return
    }
    setTagRenameError(null)
    try {
      await onUpdateTag(tagId, { label: trimmed })
    } catch (error) {
      console.error("Failed to rename tag", error)
    } finally {
      setTagRenameDraft(null)
    }
  }, [allTags, onUpdateTag])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>Add or remove tags.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">Current tags (click to remove)</p>
              <span className="text-[11px] font-medium text-muted-foreground">
                {assignedTags.length} / {maxTags}
              </span>
            </div>
            {assignedTags.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {assignedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="rounded-full"
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    <TagBadge
                      tag={tag}
                      showRemoveIcon
                      className="transition-colors"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No tags selected yet.</p>
            )}
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">All tags</p>
              <Command
                className="h-48 rounded-lg border border-border/60 bg-background shadow-sm overflow-hidden"
                shouldFilter={false}
              >
                <CommandInput
                  value={tagSearch}
                  onValueChange={setTagSearch}
                  placeholder="Search or create tags..."
                  maxLength={TAG_LABEL_MAX_LENGTH}
                />
                <CommandList className="flex-1 overflow-y-auto">
                  {canCreateTagOption && (
                    <CommandItem
                      value={`create-${tagSearch}`}
                      onSelect={() => handleCreateTag(tagSearch)}
                      className="flex items-center gap-3 bg-background text-primary"
                      disabled={isCreatingTag}
                    >
                      <Plus className="size-4" />
                      <div className="flex flex-1 flex-col text-left">
                        <span className="text-sm">Create &quot;{tagSearch.trim()}&quot;</span>
                      </div>
                    </CommandItem>
                  )}
                  {filteredTags.map((tag) => {
                    return (
                      <CommandItem
                        key={tag.id}
                        value={`${tag.label} ${tag.type}`}
                        onPointerDownCapture={(event) => {
                          const target = event.target as HTMLElement
                          if (target.closest('[data-tag-menu-trigger="true"]')) {
                            suppressSelectionRef.current = true
                          }
                        }}
                        onSelect={() => {
                          if (suppressSelectionRef.current) {
                            suppressSelectionRef.current = false
                            return
                          }
                          handleAddTag(tag.id)
                        }}
                        className="flex items-center gap-3"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: tag.color ?? "var(--primary)" }}
                        />
                        <div className="flex flex-1 flex-col text-left">
                          <span className="text-sm">{tag.label}</span>
                        </div>
                        <DropdownMenu
                          onOpenChange={(open) => {
                            if (open) {
                              setTagRenameDraft({ id: tag.id, value: tag.label })
                              setTagRenameError(null)
                            } else {
                              suppressSelectionRef.current = false
                              setTagRenameDraft(null)
                              setTagRenameError(null)
                            }
                          }}
                        >
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              data-tag-menu-trigger="true"
                              onClick={(event) => {
                                event.stopPropagation()
                                suppressSelectionRef.current = true
                              }}
                              onPointerDown={(event) => {
                                event.stopPropagation()
                                suppressSelectionRef.current = true
                              }}
                              onPointerUp={(event) => {
                                event.stopPropagation()
                              }}
                            >
                              <EllipsisVertical className="size-4" />
                              <span className="sr-only">Open tag menu</span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-44"
                            onPointerDownCapture={() => {
                              suppressSelectionRef.current = true
                            }}
                            onClickCapture={() => {
                              suppressSelectionRef.current = true
                            }}
                            onKeyDownCapture={() => {
                              suppressSelectionRef.current = true
                            }}
                          >
                            <DropdownMenuLabel
                              className={cn(
                                "text-xs",
                                tagRenameError?.id === tag.id ? "text-destructive" : "text-muted-foreground"
                              )}
                            >
                              {tagRenameError?.id === tag.id ? tagRenameError.message : "Rename"}
                            </DropdownMenuLabel>
                            <div className="px-2 pb-2">
                              <Input
                                value={
                                  tagRenameDraft?.id === tag.id
                                    ? tagRenameDraft.value
                                    : tag.label
                                }
                                onChange={(event) => {
                                  const nextValue = event.target.value
                                  setTagRenameDraft({ id: tag.id, value: nextValue })
                                  const trimmed = nextValue.trim().toLowerCase()
                                  if (!trimmed) {
                                    setTagRenameError({ id: tag.id, message: "Required" })
                                    return
                                  }
                                  if (allTags.some((other) => other.id !== tag.id && other.label.trim().toLowerCase() === trimmed)) {
                                    setTagRenameError({ id: tag.id, message: "Duplicate" })
                                  } else {
                                    setTagRenameError(null)
                                  }
                                }}
                                onKeyDown={(event) => {
                                  event.stopPropagation()
                                  if (event.key === "Enter") {
                                    event.preventDefault()
                                    handleRenameTag(tag.id, tagRenameDraft?.value ?? tag.label)
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault()
                                    setTagRenameDraft({ id: tag.id, value: tag.label })
                                    setTagRenameError(null)
                                  }
                                }}
                                onClick={(event) => event.stopPropagation()}
                                onPointerDown={(event) => event.stopPropagation()}
                                onPointerUp={(event) => event.stopPropagation()}
                                onKeyUp={(event) => event.stopPropagation()}
                                disabled={!onUpdateTag}
                                className={cn(
                                  "h-8 w-full",
                                  tagRenameError?.id === tag.id && "border-destructive ring-1 ring-destructive/60 focus-visible:ring-destructive"
                                )}
                                aria-invalid={tagRenameError?.id === tag.id}
                              />
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                suppressSelectionRef.current = true
                                onDeleteTag?.(tag.id)
                              }}
                              className="text-destructive focus:text-destructive"
                              disabled={!onDeleteTag}
                            >
                              Delete tag
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {TAG_COLOR_PRESETS.map(({ color, name }) => (
                              <DropdownMenuItem
                                key={`${tag.id}-${color}`}
                                onSelect={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  suppressSelectionRef.current = true
                                  onUpdateTag?.(tag.id, { color })
                                }}
                                disabled={!onUpdateTag}
                                className="flex items-center gap-2"
                              >
                                <span
                                  className="inline-block size-3 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="truncate">{name}</span>
                                {tag.color === color && (
                                  <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Current</span>
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CommandItem>
                    )
                  })}
                  {!canCreateTagOption && filteredTags.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Type to search or create.
                    </div>
                  )}
                </CommandList>
              </Command>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
