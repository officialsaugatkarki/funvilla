'use client'

import { useEffect } from 'react'
import { startPrintWorker } from '@/lib/printing/print-worker'

/**
 * Top-level provider that starts the POS print worker once for the entire
 * admin session. Placed in the admin layout so it persists across all pages.
 *
 * The worker stores its state on window.__posWorker (not in React state),
 * so it survives re-renders, HMR reloads, and client-side navigation.
 */
export function PrintWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Small delay to ensure the Capacitor bridge has fully injected into the
    // WebView before we check isNativeAndroid() / isPOSWorkerMode()
    const timer = setTimeout(() => {
      startPrintWorker()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return <>{children}</>
}
