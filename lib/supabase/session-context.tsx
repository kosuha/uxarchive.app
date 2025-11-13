"use client"

import React from "react"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"

import { getBrowserSupabaseClient } from "./browser-client"

export type SessionContextValue = {
  supabase: SupabaseClient
  session: Session | null
  user: User | null
  loading: boolean
  refreshSession: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = React.createContext<SessionContextValue | undefined>(
  undefined
)

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const supabase = React.useMemo(() => getBrowserSupabaseClient(), [])
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let isMounted = true

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!isMounted) return
      setSession(session ?? null)
      setLoading(false)
    }

    syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const refreshSession = React.useCallback(async () => {
    setLoading(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    setSession(session ?? null)
    setLoading(false)
  }, [supabase])

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut()
    await refreshSession()
  }, [supabase, refreshSession])

  const value = React.useMemo<SessionContextValue>(() => ({
    supabase,
    session,
    user: session?.user ?? null,
    loading,
    refreshSession,
    signOut,
  }), [supabase, session, loading, refreshSession, signOut])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSupabaseSession = () => {
  const context = React.useContext(SessionContext)
  if (!context) {
    throw new Error("useSupabaseSession 훅은 SessionProvider 내부에서만 사용할 수 있습니다.")
  }
  return context
}
