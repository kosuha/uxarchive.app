"use client"

import { useEffect } from "react"

import {
  installClientEventLogger,
  setClientEventContext,
} from "@/lib/notifications/client-events"
import { useSupabaseSession } from "@/lib/supabase/session-context"

export function ClientEventListener() {
  const { user } = useSupabaseSession()

  useEffect(() => {
    installClientEventLogger()
  }, [])

  useEffect(() => {
    setClientEventContext({ userId: user?.id })
  }, [user?.id])

  return null
}
