import type { Metadata } from 'next'
import { playfair, inter } from './fonts'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://khukuri-resort.com'),
  title: {
    default: 'Khukuri Restaurant & Resort | Premium Dining & Stay in Nepal',
    template: '%s | Khukuri Restaurant & Resort',
  },
  description: 'Experience authentic Nepali cuisine, premium luxury stays, and relaxing pool amenities at Khukuri Restaurant & Resort. Book your table or room today.',
  keywords: ['restaurant in nepal', 'resort', 'authentic nepali food', 'luxury stay', 'swimming pool resort', 'khukuri restaurant'],
  authors: [{ name: 'Khukuri HMP' }],
  creator: 'saugat karki',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://khukuri-resort.com',
    title: 'Khukuri Restaurant & Resort',
    description: 'Experience authentic Nepali cuisine, premium luxury stays, and relaxing pool amenities at Khukuri Restaurant & Resort.',
    siteName: 'Khukuri Restaurant & Resort',
    images: [{ url: '/images/logo.jpeg', width: 800, height: 600, alt: 'Khukuri Resort Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Khukuri Restaurant & Resort',
    description: 'Experience authentic Nepali cuisine, premium luxury stays, and relaxing pool amenities at Khukuri Restaurant & Resort.',
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
        {children}
        <Toaster richColors position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
