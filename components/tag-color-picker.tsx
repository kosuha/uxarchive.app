"use client"

import * as React from "react"
import { HexColorPicker } from "react-colorful"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DEFAULT_TAG_COLOR } from "@/lib/tag-constants"
import { cn } from "@/lib/utils"

export type TagColorPickerProps = {
  color: string
  onChange: (value: string) => void
  defaultColor?: string
  ariaLabel?: string
  triggerClassName?: string
  popoverClassName?: string
}

export function TagColorPicker({
  color,
  onChange,
  defaultColor = DEFAULT_TAG_COLOR,
  ariaLabel = "Choose tag color",
  triggerClassName,
  popoverClassName,
}: TagColorPickerProps) {
  const [inputValue, setInputValue] = React.useState(color.toUpperCase())

  React.useEffect(() => {
    setInputValue(color.toUpperCase())
  }, [color])

  const normalizeValue = (value: string) => {
    const hex = value.replace(/^#/, "").toUpperCase().replace(/[^0-9A-F]/g, "")
    return `#${hex}`.slice(0, 7)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = normalizeValue(event.target.value)
    setInputValue(formatted)
    if (/^#([0-9A-F]{6})$/.test(formatted)) {
      onChange(formatted)
    }
  }

  const handleInputBlur = () => {
    if (!/^#([0-9A-F]{6})$/.test(inputValue)) {
      setInputValue(color.toUpperCase())
    }
  }

  const handlePickerChange = (value: string) => {
    const normalized = normalizeValue(value)
    setInputValue(normalized)
    if (/^#([0-9A-F]{6})$/.test(normalized)) {
      onChange(normalized)
    }
  }

  const handleReset = () => {
    const normalizedDefault = defaultColor.toUpperCase()
    setInputValue(normalizedDefault)
    onChange(normalizedDefault)
  }

  const isDefault = color.toUpperCase() === defaultColor.toUpperCase()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "size-9 rounded-full border border-border/60 ring-offset-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            triggerClassName
          )}
          style={{ backgroundColor: color }}
          aria-label={ariaLabel}
        >
          <span className="sr-only">{ariaLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[250px] space-y-3", popoverClassName)}>
        <div className="rounded-lg border border-border/80 p-3">
          <HexColorPicker color={color} onChange={handlePickerChange} className="h-40 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            maxLength={7}
            className="font-mono text-sm"
            aria-label="Hex color value"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={isDefault}>
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
