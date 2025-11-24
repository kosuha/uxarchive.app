import * as React from "react"
import Image from "next/image"
import { GalleryHorizontalEnd, Loader2, Minus, Plus, Trash2, UploadCloud } from "lucide-react"

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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Capture } from "@/lib/types"

import type { CaptureReorderPosition, CaptureUploadPayload } from "./types"

type CaptureStripProps = {
  captures: Capture[]
  activeId?: string
  onSelect: (id: string) => void
  onUploadCapture: (payload: CaptureUploadPayload) => Promise<void> | void
  onReorderCapture: (sourceId: string, targetId: string, position: CaptureReorderPosition) => void
  onDeleteCapture: (captureId: string) => void
  readOnly?: boolean
  uploadDisabledReason?: string | null
}

export function CaptureStrip({
  captures,
  activeId,
  onSelect,
  onUploadCapture,
  onReorderCapture,
  onDeleteCapture,
  readOnly,
  uploadDisabledReason,
}: CaptureStripProps) {
  const hasCaptures = captures.length > 0
  const isReadOnly = Boolean(readOnly)
  const allowDnD = !isReadOnly
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dropHint, setDropHint] = React.useState<{
    targetId: string
    position: CaptureReorderPosition
  } | null>(null)
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false)

  const resetDragState = React.useCallback(() => {
    setDraggingId(null)
    setDropHint(null)
  }, [])

  const handleDialogOpenChange = React.useCallback((open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) {
      setDeleteTargetId(null)
    }
  }, [])

  const handleConfirmDelete = React.useCallback(() => {
    if (!deleteTargetId) return
    onDeleteCapture(deleteTargetId)
    setDeleteTargetId(null)
    setDeleteDialogOpen(false)
  }, [deleteTargetId, onDeleteCapture])

  const handleDragStart = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>, captureId: string) => {
      if (!allowDnD) return
      setDraggingId(captureId)
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", captureId)
    },
    [allowDnD]
  )

  const handleDragOver = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>, targetId: string) => {
      if (!allowDnD) return
      if (!draggingId || draggingId === targetId) return
      event.preventDefault()
      const rect = event.currentTarget.getBoundingClientRect()
      const isAfter = event.clientX - rect.left > rect.width / 2
      setDropHint({
        targetId,
        position: isAfter ? "after" : "before",
      })
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move"
      }
    },
    [allowDnD, draggingId]
  )

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLButtonElement>, targetId: string) => {
      if (!allowDnD) return
      event.preventDefault()
      event.stopPropagation()
      const sourceId = event.dataTransfer?.getData("text/plain")
      if (!sourceId || sourceId === targetId) {
        resetDragState()
        return
      }
      const rect = event.currentTarget.getBoundingClientRect()
      const isAfter = event.clientX - rect.left > rect.width / 2
      onReorderCapture(sourceId, targetId, isAfter ? "after" : "before")
      resetDragState()
    },
    [allowDnD, onReorderCapture, resetDragState]
  )

  const handleContainerDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!allowDnD) return
      if (!draggingId) return
      event.preventDefault()
      const sourceId = event.dataTransfer?.getData("text/plain")
      if (!sourceId || captures.length === 0) {
        resetDragState()
        return
      }
      const lastCapture = captures[captures.length - 1]
      if (!lastCapture || sourceId === lastCapture.id) {
        resetDragState()
        return
      }
      onReorderCapture(sourceId, lastCapture.id, "after")
      resetDragState()
    },
    [allowDnD, captures, draggingId, onReorderCapture, resetDragState]
  )

  const handleContainerDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!allowDnD) return
      if (!draggingId) return
      event.preventDefault()
    },
    [allowDnD, draggingId]
  )

  const handleContainerDragLeave = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!allowDnD) return
    const nextTarget = event.relatedTarget as Node | null
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setDropHint(null)
    }
  }, [allowDnD])

  const handleDeleteClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, captureId: string) => {
      if (isReadOnly) return
      event.preventDefault()
      event.stopPropagation()
      setDeleteTargetId(captureId)
      setDeleteDialogOpen(true)
    },
    [isReadOnly]
  )

  React.useEffect(() => {
    if (!activeId) return
    const container = scrollContainerRef.current
    if (!container) return
    const activeButton = container.querySelector<HTMLElement>(`[data-capture-id="${activeId}"]`)
    if (!activeButton) return

    const containerRect = container.getBoundingClientRect()
    const itemRect = activeButton.getBoundingClientRect()
    const fullyVisible = itemRect.left >= containerRect.left && itemRect.right <= containerRect.right

    if (!fullyVisible) {
      activeButton.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" })
    }
  }, [activeId])

  return (
    <div className="w-full min-w-0 border-t border-border/60 px-4 py-4" data-capture-strip>
      <div className="w-full mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <GalleryHorizontalEnd className="size-3.5" />
            Capture strip
          </div>
          <span className="text-xs text-muted-foreground">{captures.length} items</span>
        </div>
        {!isReadOnly && (
          <CaptureUploadDialog
            captureCount={captures.length}
            onUploadCapture={onUploadCapture}
            disabledReason={uploadDisabledReason}
          />
        )}
      </div>
      {hasCaptures ? (
        <div className="relative w-full min-w-0 h-28">
          <div
            className="absolute inset-0 overflow-y-hidden overflow-x-auto"
            onDragOver={allowDnD ? handleContainerDragOver : undefined}
            onDrop={allowDnD ? handleContainerDrop : undefined}
            onDragLeave={allowDnD ? handleContainerDragLeave : undefined}
            ref={scrollContainerRef}
          >
            <div className="flex w-max max-w-none gap-2 px-2 pb-2">
              {captures.map((capture) => {
                const isActive = activeId === capture.id
                const isDragging = draggingId === capture.id
                const isDropBefore =
                  dropHint?.targetId === capture.id && dropHint.position === "before"
                const isDropAfter =
                  dropHint?.targetId === capture.id && dropHint.position === "after"
                const imageSrc = capture.imageUrl?.trim()
                return (
                  <div className="flex flex-none items-center gap-1" key={capture.id}>
                    {allowDnD && isDropBefore && <DropIndicator position="before" />}
                    <div className="group relative shrink-0">
                      <button
                        type="button"
                        draggable={allowDnD}
                        aria-grabbed={allowDnD ? isDragging : undefined}
                        data-capture-id={capture.id}
                        onClick={() => onSelect(capture.id)}
                        onDragStart={allowDnD ? (event) => handleDragStart(event, capture.id) : undefined}
                        onDragEnd={allowDnD ? resetDragState : undefined}
                        onDragOver={allowDnD ? (event) => handleDragOver(event, capture.id) : undefined}
                        onDrop={allowDnD ? (event) => handleDrop(event, capture.id) : undefined}
                        className={cn(
                          "relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border text-left transition-all focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "border-3 border-primary shadow-md"
                            : "border-border/60 hover:border-primary/60",
                          isDragging && "opacity-70 ring-2 ring-primary"
                        )}
                      >
                        {imageSrc ? (
                          <Image
                            src={imageSrc}
                            alt="Capture thumbnail"
                            fill
                            sizes="80px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-[10px] font-medium text-muted-foreground">
                            No image
                          </div>
                        )}
                        <span
                          className={cn(
                            "absolute bottom-1 left-1 rounded-full px-1.5 text-[10px] font-semibold shadow-sm",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.4)]"
                              : "bg-black/70 text-white"
                          )}
                        >
                          {capture.order}
                        </span>
                      </button>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          size="icon"
                          variant="default"
                          onClick={(event) => handleDeleteClick(event, capture.id)}
                          aria-label="Delete capture"
                          draggable={false}
                          className={cn(
                            "absolute right-1 top-1 size-6 rounded-full bg-destructive p-0 text-white opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-destructive/80",
                            isDragging && "pointer-events-none opacity-0"
                          )}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    {allowDnD && isDropAfter && <DropIndicator position="after" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 px-4 text-sm text-muted-foreground">
          {isReadOnly ? "No captures have been shared yet." : "No captures uploaded yet."}
          <span className="mt-1 text-xs text-muted-foreground/80">
            {isReadOnly ? "Once the author adds captures you'll see them here." : "Add a new capture image to get started."}
          </span>
        </div>
      )}
      {!isReadOnly && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDialogOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete capture?</AlertDialogTitle>
              <AlertDialogDescription>
                The selected capture and its related insights cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function DropIndicator({ position }: { position: CaptureReorderPosition }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-24 w-0.5 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.45)]",
        position === "before" ? "-ml-1" : "-mr-1"
      )}
    />
  )
}

function CaptureUploadDialog({
  captureCount,
  onUploadCapture,
  disabledReason,
}: {
  captureCount: number
  onUploadCapture: (payload: CaptureUploadPayload) => Promise<void> | void
  disabledReason?: string | null
}) {
  type SelectedPreview = { file: File; previewUrl: string }
  const [open, setOpen] = React.useState(false)
  const [selectedFiles, setSelectedFiles] = React.useState<SelectedPreview[]>([])
  const [order, setOrder] = React.useState(captureCount + 1)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const objectUrlsRef = React.useRef<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const fileInputId = React.useId()

  const revokeAllObjectUrls = React.useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current = []
  }, [])

  const resetState = React.useCallback(() => {
    revokeAllObjectUrls()
    setSelectedFiles([])
    setOrder(captureCount + 1)
    setErrorMessage(null)
    setIsSubmitting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [captureCount, revokeAllObjectUrls])

  React.useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  React.useEffect(() => {
    setOrder((current) => {
      const maxOrder = captureCount + 1
      const normalized = Math.min(Math.max(current, 1), maxOrder)
      return Number.isNaN(normalized) ? maxOrder : normalized
    })
  }, [captureCount])

  React.useEffect(() => () => revokeAllObjectUrls(), [revokeAllObjectUrls])

  const updatePreviews = React.useCallback(
    (files: File[]) => {
      if (!files.length) {
        revokeAllObjectUrls()
        setSelectedFiles([])
        return
      }
      revokeAllObjectUrls()
      const nextSelections = files.map((file) => {
        const previewUrl = URL.createObjectURL(file)
        objectUrlsRef.current.push(previewUrl)
        return { file, previewUrl }
      })
      setSelectedFiles(nextSelections)
    },
    [revokeAllObjectUrls]
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    updatePreviews(files)
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const files = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : []
    updatePreviews(files)
  }

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  const handleRemoveFile = React.useCallback((previewUrl: string) => {
    URL.revokeObjectURL(previewUrl)
    objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== previewUrl)
    setSelectedFiles((current) => {
      const next = current.filter((item) => item.previewUrl !== previewUrl)
      if (!next.length && fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return next
    })
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFiles.length) {
      setErrorMessage("Please select an image to upload.")
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const maxOrder = captureCount + 1
      const baseOrder = Math.min(Math.max(order, 1), maxOrder)
      const uploadTasks = selectedFiles.map((item, index) =>
        Promise.resolve(onUploadCapture({ file: item.file, order: baseOrder + index }))
      )
      await Promise.all(uploadTasks)
      setOpen(false)
    } catch (error) {
      console.error("capture upload preparation failed", error)
      setErrorMessage("Something went wrong while preparing the upload. Please try again in a moment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const uploadButton = (
    <Button
      variant="default"
      size="sm"
      aria-label="Upload capture image"
      disabled={Boolean(disabledReason)}
    >
      <Plus className="size-4" />
      Upload
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {disabledReason ? (
          <Tooltip>
            <TooltipTrigger asChild>{uploadButton}</TooltipTrigger>
            <TooltipContent>{disabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          uploadButton
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload capture images</DialogTitle>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor={fileInputId}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-muted/40 px-6 py-8 text-center text-sm text-muted-foreground transition hover:border-primary/60 hover:bg-primary/5"
            >
              <UploadCloud className="size-6 text-primary" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Drag or click to select multiple images.</p>
                <p className="text-xs text-muted-foreground/80">Supports PNG, JPG, SVG, and other image files.</p>
              </div>
            </label>
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {Boolean(selectedFiles.length) && (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Selected files {selectedFiles.length}
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {selectedFiles.map(({ file, previewUrl }) => (
                  <div
                    key={previewUrl}
                    className="flex items-center gap-3 rounded-md border border-border/50 bg-background p-2"
                  >
                    <div className="relative h-16 w-16 overflow-hidden rounded-sm bg-muted/30">
                      <Image
                        src={previewUrl}
                        alt={`${file.name} preview`}
                        fill
                        sizes="64px"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col text-xs">
                      <p className="truncate font-medium text-foreground">{file.name}</p>
                      <p className="text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFile(previewUrl)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove {file.name}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedFiles.length || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
