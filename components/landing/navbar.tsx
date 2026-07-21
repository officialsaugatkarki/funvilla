'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Menu } from 'lucide-react'

const navLinks = [
  { name: 'Rooms & Stay', href: '/#rooms' },
  { name: 'Menu', href: '/menu' },
]

export function Navbar() {
  return (
    <nav className="w-full bg-background pt-4 pb-4 sticky top-0 z-50">
      <div className="w-full h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.jpeg"
            alt="Khukuri Logo"
            width={40}
            height={40}
            className="rounded-full object-cover shadow-sm border border-black/5"
          />
          <div className="flex flex-col">
            <span className="font-serif text-lg leading-none tracking-wide text-primary uppercase">Khukuri</span>
            <span className="text-[8px] font-sans font-semibold uppercase tracking-[0.2em] text-primary/60">Restaurant & Resort</span>
          </div>
        </Link>

        {/* Center Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className="text-xs font-semibold text-primary/70 hover:text-primary transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <a
            href="https://wa.me/9779855073719?text=I%20want%20to%20book%20a%20room"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex h-10 items-center justify-center rounded-full bg-primary px-6 text-xs font-semibold text-white transition-all hover:bg-primary/90"
          >
            Book Now
            <svg className="ml-2 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </a>
          
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white hover:bg-black/80 transition-colors">
            <Menu className="h-4 w-4" />
          </button>
        </div>

      </div>
    </nav>
  )
}
