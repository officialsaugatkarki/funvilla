import type { Metadata, Viewport } from 'next'
import { playfair, inter } from './fonts'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { NativeProvider } from '@/components/providers/native-provider'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.khukurirestaurantfunvilla.com')),
  title: {
    default: 'Khukuri Restaurant & Fun Villa | Premium Dining & Stay in Nepal',
    template: '%s | Khukuri Restaurant & Fun Villa',
  },
  description: 'Experience authentic Nepali cuisine, premium luxury stays, and relaxing pool amenities at Khukuri Restaurant & Fun Villa. Book your table or room today.',
  keywords: ['restaurant in nepal', 'resort', 'authentic nepali food', 'luxury stay', 'swimming pool resort', 'khukuri restaurant'],
  authors: [{ name: 'Khukuri Restaurant & Fun Villa' }],
  creator: 'Khukuri Restaurant & Fun Villa',
  // ── PWA / Apple-specific metadata ──────────────────────────────────────────
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Khukuri',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.khukurirestaurantfunvilla.com'),
    title: 'Khukuri Restaurant & Fun Villa',
    description: 'Experience authentic Nepali cuisine, premium luxury stays, and relaxing pool amenities at Khukuri Restaurant & Fun Villa.',
    siteName: 'Khukuri Restaurant & Fun Villa',
    images: [{ url: '/images/logo.jpeg', width: 800, height: 600, alt: 'Khukuri Fun Villa Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Khukuri Restaurant & Fun Villa',
    description: 'Experience authentic Nepali cuisine, premium luxury stays, and relaxing pool amenities at Khukuri Restaurant & Fun Villa.',
    images: ['/images/logo.jpeg'],
  },
  icons: {
    icon: [
      { url: '/icons/favicon-196.png', sizes: '196x196', type: 'image/png' },
      { url: '/icons/manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icons/favicon-196.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* ── iOS Splash Screens (apple-touch-startup-image) ──────────────────
            Next.js Metadata API does not yet support these, so we inject them
            directly. iOS Safari reads these at install time to display a proper
            splash screen when launching from the home screen. */}
        {/* iPhone 16 Pro Max */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1320-2868.png" media="screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1320-2868.png" media="screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 16 Pro */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1206-2622.png" media="screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1206-2622.png" media="screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 16 Plus / 15 Plus */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1260-2736.png" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1260-2736.png" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 16 / 15 / 14 */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1290-2796.png" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1290-2796.png" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 15 Pro / 14 Pro */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1179-2556.png" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1179-2556.png" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 14 Pro Max / 13 Pro Max */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1284-2778.png" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1284-2778.png" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 13 / 13 Pro / 12 Pro */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1170-2532.png" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1170-2532.png" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 12 mini / 13 mini */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1080-2340.png" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1080-2340.png" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 11 Pro Max / XS Max */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1242-2688.png" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1242-2688.png" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 11 / XR */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-828-1792.png" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-828-1792.png" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone X / XS / 11 Pro */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1125-2436.png" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1125-2436.png" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 8 Plus / 7 Plus */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1242-2208.png" media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-1242-2208.png" media="screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone 8 / SE (2nd gen) */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-750-1334.png" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-750-1334.png" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)" />
        {/* iPhone SE (1st gen) / 5 */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-640-1136.png" media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-dark-640-1136.png" media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait) and (prefers-color-scheme: dark)" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-background text-foreground`} suppressHydrationWarning>
        <NativeProvider>
          {children}
          <Toaster richColors position="top-right" />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </NativeProvider>
      </body>
    </html>
  )
}
