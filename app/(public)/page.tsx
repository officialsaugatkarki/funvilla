import dynamic from 'next/dynamic'
import { LayoutContainer } from '@/components/ui/layout-container'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { NativeRedirect } from '@/components/native-redirect'

// Lazy-load below-the-fold components to improve initial JS payload and parse time.
const Experiences = dynamic(() => import('@/components/landing/experiences').then(mod => mod.Experiences))
const Features = dynamic(() => import('@/components/landing/features').then(mod => mod.Features))
const QRCta = dynamic(() => import('@/components/landing/qr-cta').then(mod => mod.QRCta))
const About = dynamic(() => import('@/components/landing/about').then(mod => mod.About))
const RestaurantPreview = dynamic(() => import('@/components/landing/restaurant-preview').then(mod => mod.RestaurantPreview))
const PoolPreview = dynamic(() => import('@/components/landing/pool-preview').then(mod => mod.PoolPreview))
const RoomsPreview = dynamic(() => import('@/components/landing/rooms-preview').then(mod => mod.RoomsPreview))
const Gallery = dynamic(() => import('@/components/landing/gallery').then(mod => mod.Gallery))
const Reviews = dynamic(() => import('@/components/landing/reviews').then(mod => mod.Reviews))
const Footer = dynamic(() => import('@/components/landing/footer').then(mod => mod.Footer))

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <NativeRedirect />
      <LayoutContainer>
        <Navbar />
        <Hero />
        <Experiences />
        <Features />
        <QRCta />

        {/* Consistent section rhythm: space-y-14 (was space-y-24) */}
        <div className="space-y-14 pb-16">
          <About />
          <RestaurantPreview />
          <PoolPreview />
          <RoomsPreview />
          <Gallery />
          <Reviews />
        </div>
      </LayoutContainer>

      {/* Footer: pt-10 (was pt-24) */}
      <LayoutContainer className="pt-10 pb-6">
        <Footer />
      </LayoutContainer>
    </div>
  )
}
