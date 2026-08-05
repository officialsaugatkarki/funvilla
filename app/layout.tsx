import type { Metadata } from 'next'
import { playfair, inter } from './fonts'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { NativeProvider } from '@/components/providers/native-provider'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://khukurirestaurantfunvilla.com')),
  title: {
    default: 'Khukuri Restaurant & Fun Villa | Premium Dining & Stay in Nepal',
    template: '%s | Khukuri Restaurant & Fun Villa',
  },
  description: 'Experience authentic Nepali cuisine, premium luxury stays, and relaxing pool amenities at Khukuri Restaurant & Fun Villa. Book your table or room today.',
  keywords: ['restaurant in nepal', 'resort', 'authentic nepali food', 'luxury stay', 'swimming pool resort', 'khukuri restaurant'],
  authors: [{ name: 'Khukuri Restaurant & Fun Villa' }],
  creator: 'Khukuri Restaurant & Fun Villa',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://khukurirestaurantfunvilla.com'),
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
    icon: '/images/logo.jpeg',
    apple: '/images/logo.jpeg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
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
