'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { MotionConfig } from 'framer-motion'

/**
 * NativeProvider
 * 
 * 1. Determines if the app is running in a native Capacitor WebView (iOS/Android).
 * 2. Injects `.is-native` class into the HTML element for targeted CSS overrides.
 * 3. Wraps children in Framer Motion's MotionConfig to reduce heavy animations natively.
 * 4. Hides the Capacitor SplashScreen only after React is fully mounted.
 */
export function NativeProvider({ children }: { children: React.ReactNode }) {
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    // Only runs on the client
    const native = Capacitor.isNativePlatform()
    setIsNative(native)

    if (native) {
      document.documentElement.classList.add('is-native')
      // Safely hide the splash screen now that React is mounted and rendering
      setTimeout(() => {
        SplashScreen.hide().catch(console.error)
      }, 100) // small buffer for final paint
    } else {
      document.documentElement.classList.remove('is-native')
    }
  }, [])

  return (
    // 'always' drastically reduces layout/paint overhead for motion on mobile WebViews
    <MotionConfig reducedMotion={isNative ? 'always' : 'user'}>
      {children}
    </MotionConfig>
  )
}
