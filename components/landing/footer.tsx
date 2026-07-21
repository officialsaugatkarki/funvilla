'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Facebook, Instagram, MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react'

export function Footer() {
  return (
    // pt-20 → pt-10, rounded tighter, smaller overall
    <footer className="bg-primary text-white overflow-hidden rounded-[1.75rem] relative">
      <div className="absolute inset-0 bg-[url('/assets/IMG_0891.jpeg')] bg-cover bg-center opacity-5 mix-blend-overlay" />

      <div className="w-full relative z-10 p-6 sm:p-8 lg:p-10">

        {/* Location + Map — mb-12 (was mb-24), pb-10 (was pb-20), gap tighter */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 mb-10 border-b border-white/10 pb-10">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl mb-5">Find Us Here.</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-0.5">Address</p>
                  <p className="text-white/65 text-sm">Hetauda, Makwanpur<br />Bagmati Province, Nepal</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-0.5">Contact</p>
                  <p className="text-white/65 text-sm">+977 9855073719</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-0.5">Hours</p>
                  <p className="text-white/65 text-sm">Everyday: 8:00 AM – 10:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map — h-[220px] (was 300px) */}
          <div className="h-[220px] w-full rounded-2xl overflow-hidden bg-white/10 relative">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d113063.13601556073!2d84.95470656641217!3d27.443725597920364!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb49018dc3b5c7%3A0x6d2c0b6b06e8b2b!2sHetauda!5e0!3m2!1sen!2snp!4v1700000000000!5m2!1sen!2snp"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
            />
          </div>
        </div>

        {/* Main Footer Columns — gap-8 (was gap-12), pb-10 (was pb-16) */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <Image
                src="/images/logo.jpeg"
                alt="Khukuri Restaurant & Resort"
                width={36}
                height={36}
                className="rounded-full border border-white/20"
              />
              <span className="font-serif text-lg tracking-wide">Khukuri</span>
            </Link>
            <p className="text-white/55 text-xs leading-relaxed mb-5">
              A premium destination blending exceptional hospitality, delicious dining, and nature's tranquility.
            </p>
            <div className="flex gap-3">
              <a href="#" className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-accent hover:border-accent hover:text-primary transition-all">
                <Facebook className="h-3.5 w-3.5" />
              </a>
              <a href="#" className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white hover:bg-accent hover:border-accent hover:text-primary transition-all">
                <Instagram className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-base mb-4">Navigation</h3>
            <ul className="space-y-2.5 text-xs text-white/55">
              <li><Link href="#about" className="hover:text-accent transition-colors">About Us</Link></li>
              <li><Link href="/menu" className="hover:text-accent transition-colors">Restaurant Menu</Link></li>
              <li><Link href="#pool" className="hover:text-accent transition-colors">Swimming Pool</Link></li>
              <li><Link href="#rooms" className="hover:text-accent transition-colors">Rooms &amp; Stay</Link></li>
              <li><Link href="#gallery" className="hover:text-accent transition-colors">Gallery</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-base mb-4">Experiences</h3>
            <ul className="space-y-2.5 text-xs text-white/55">
              <li><Link href="#events" className="hover:text-accent transition-colors">Family Events</Link></li>
              <li><Link href="#events" className="hover:text-accent transition-colors">Parties &amp; Celebrations</Link></li>
              <li><Link href="#events" className="hover:text-accent transition-colors">Corporate Retreats</Link></li>
              <li><Link href="/menu" className="hover:text-accent transition-colors">Fine Dining</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-base mb-4">Newsletter</h3>
            <p className="text-white/55 text-xs mb-3">Subscribe to receive special offers and updates.</p>
            <form className="relative" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Your email address"
                className="w-full h-10 bg-white/5 border border-white/10 rounded-full px-4 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 h-8 w-8 flex items-center justify-center bg-accent text-primary rounded-full hover:bg-white transition-colors"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Big Typography — scaled down */}
        <div className="w-full flex justify-center overflow-hidden border-t border-white/10 pt-6 pb-3">
          <h1 className="font-serif text-[12vw] leading-none tracking-tighter text-white/5 select-none uppercase">
            Khukuri
          </h1>
        </div>

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-white/35 pb-4">
          <p>&copy; {new Date().getFullYear()} Khukuri Restaurant &amp; Resort. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
