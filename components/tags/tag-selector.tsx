"use client"

import * as React from "react"
import { Check, Hash, Plus, X } from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TagBadge } from "@/components/tag-badge"
import { cn } from "@/lib/utils"
import { Tag } from "@/lib/types"

interface TagSelectorProps {
  availableTags: Tag[]
  selectedTags: Tag[]
  onSelectTag: (tagId: string) => void
  onRemoveTag: (tagId: string) => void
  onCreateTag?: (label: string) => void
  readonly?: boolean
}

export function TagSelector({
  availableTags,
  selectedTags,
  onSelectTag,
  onRemoveTag,
  onCreateTag,
  readonly,
}: TagSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const selectedTagIds = new Set(selectedTags.map((t) => t.id))

  const filteredTags = React.useMemo(() => {
    if (!searchValue) return availableTags
    return availableTags.filter((tag) =>
      tag.label.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [availableTags, searchValue])

  if (readonly && selectedTags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="flex items-center gap-1 pr-1"
          style={{
            backgroundColor: tag.color ? \`\${tag.color}20\` : undefined,
            borderColor: tag.color ? \`\${tag.color}40\` : undefined,
            color: tag.color ? tag.color : undefined,
          }}
        >
          <span className="text-xs font-medium">{tag.label}</span>
          {!readonly && (
            <button
              onClick={() => onRemoveTag(tag.id)}
              className="ml-1 rounded-full p-0.5 hover:bg-background/50 focus:outline-none"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag.label} tag</span>
            </button>
          )}
        </Badge>
      ))}

      {!readonly && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 rounded-full border-dashed text-xs font-medium text-muted-foreground hover:border-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search tags..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                  {onCreateTag ? (
                     <div className="px-2">
                       <p className="mb-2">No tag found.</p>
                       <Button
                         variant="outline"
                         size="sm"
                         className="w-full justify-start text-xs"
                         onClick={() => {
                           onCreateTag(searchValue)
                           setSearchValue("")
                           setOpen(false)
                         }}
                       >
                         <Plus className="mr-2 h-3 w-3" />
                         Create "{searchValue}"
                       </Button>
                     </div>
                  ) : "No tags found."}
                </CommandEmpty>
                <CommandGroup heading="Tags">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTagIds.has(tag.id)
                    return (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => {
                          if (isSelected) {
                            onRemoveTag(tag.id)
                          } else {
                            onSelectTag(tag.id)
                          }
                          setOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: tag.color || "gray" }}
                          />
                          <span className="flex-1 truncate">{tag.label}</span>
                          {isSelected && <Check className="ml-auto h-3 w-3" />}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
