export type CanvasPoint = {
  x: number
  y: number
}

export const clampPercentage = (value: number) => Math.min(100, Math.max(0, value))

export { allowContextMenuProps } from "@/lib/context-menu"
