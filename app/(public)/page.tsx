import { LayoutContainer } from '@/components/ui/layout-container'
import { Navbar } from '@/components/landing/navbar'
import { Hero } from '@/components/landing/hero'
import { About } from '@/components/landing/about'
import { Experiences } from '@/components/landing/experiences'
import { RestaurantPreview } from '@/components/landing/restaurant-preview'
import { PoolPreview } from '@/components/landing/pool-preview'
import { RoomsPreview } from '@/components/landing/rooms-preview'
import { Gallery } from '@/components/landing/gallery'
import { Reviews } from '@/components/landing/reviews'
import { Features } from '@/components/landing/features'
import { QRCta } from '@/components/landing/qr-cta'
import { Footer } from '@/components/landing/footer'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
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
