'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Don't show if already running as a PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl bg-gray-900 text-white px-4 py-3 shadow-2xl"
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/apple-icon-180.png"
        alt="Khukuri"
        className="w-10 h-10 rounded-xl flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Install Khukuri App</p>
        <p className="text-xs text-gray-400 truncate">Add to your home screen for quick access</p>
      </div>
      <button
        onClick={handleInstall}
        className="flex-shrink-0 bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-white text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
