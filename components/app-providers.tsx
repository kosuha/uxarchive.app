"use client"

import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"

import {
  ensureQueryClientManagers,
  getQueryClient,
  getQueryPersister,
} from "@/lib/query-client"
import { SyncStatusProvider } from "@/lib/sync-status-context"
import { SessionProvider } from "@/lib/supabase/session-context"
import { SyncStatusListener } from "@/components/sync-status-listener"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const ProviderTree = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <SessionProvider>
      <SyncStatusProvider>
        {children}
        <SyncStatusListener />
      </SyncStatusProvider>
    </SessionProvider>
  </ThemeProvider>
)

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => getQueryClient())
  const persister = React.useMemo(() => getQueryPersister(), [])

  React.useEffect(() => {
    ensureQueryClientManagers()
  }, [])

  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        <ProviderTree>{children}</ProviderTree>
        <Toaster />
      </QueryClientProvider>
    )
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
      }}
    >
      <ProviderTree>{children}</ProviderTree>
      <Toaster />
    </PersistQueryClientProvider>
  )
}
