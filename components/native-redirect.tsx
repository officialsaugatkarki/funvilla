'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

/**
 * NativeRedirect
 * 
 * Silently redirects to the POS/Login screen if the application is opened natively (Android/iOS).
 * Keeps the landing page visible for normal browser users.
 */
export function NativeRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Determine if running within Capacitor Native App
    if (Capacitor.isNativePlatform()) {
      router.replace('/auth/login')
    }
  }, [router])

  return null // Renders nothing, just handles side effect
}
