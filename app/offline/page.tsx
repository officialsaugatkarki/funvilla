'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function OfflinePage() {
  useEffect(() => {
    document.title = 'Offline | Khukuri Restaurant & Fun Villa'
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <div className="max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/apple-icon-180.png"
          alt="Khukuri Restaurant & Fun Villa"
          className="w-24 h-24 mx-auto mb-6 rounded-2xl shadow-md"
        />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          You&apos;re Offline
        </h1>
        <p className="text-gray-500 mb-6">
          It looks like you don&apos;t have an internet connection right now.
          Please check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-block bg-gray-900 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-700 transition-colors mb-4"
        >
          Try Again
        </button>
        <br />
        <Link
          href="/"
          className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
