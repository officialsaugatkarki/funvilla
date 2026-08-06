'use client'

import { useEffect } from 'react'
import { startPrintWorker } from '@/lib/printing/print-worker'

/**
 * Ensures the Android POS print worker is running at all times when the app is active.
 * By wrapping the main layout in this provider, the interval and realtime 
 * subscriptions will never be garbage collected during client-side navigation.
 */
export function PrintWorkerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only starts on native Android, ignores if already started.
    const stopWorker = startPrintWorker()
    return stopWorker
  }, [])

  return <>{children}</>
}
