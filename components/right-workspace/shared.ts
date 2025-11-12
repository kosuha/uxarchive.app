export type CanvasPoint = {
  x: number
  y: number
}

export const clampPercentage = (value: number) => Math.min(100, Math.max(0, value))

export const CONTEXT_MENU_ATTRIBUTE = "data-allow-context-menu"
export const allowContextMenuProps = { [CONTEXT_MENU_ATTRIBUTE]: "true" } as const
