export const NAVIGATE_NAV_EVENT = "uxarchive:navigate-nav"

export type NavigateNavDetail = {
  navId: string
}

export const emitNavigateNavEvent = (navId: string) => {
  if (typeof window === "undefined") return
  const event = new CustomEvent<NavigateNavDetail>(NAVIGATE_NAV_EVENT, {
    detail: { navId },
  })
  window.dispatchEvent(event)
}
