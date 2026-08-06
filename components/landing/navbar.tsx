'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { name: 'Rooms & Stay', href: '/#rooms' },
  { name: 'Menu', href: '/menu' },
]

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <nav className="w-full bg-background pt-4 pb-4 sticky top-0 z-40">
        <div className="w-full h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 relative z-50">
            <Image
              src="/images/logo.jpeg"
              alt="Khukuri Logo"
              width={40}
              height={40}
              className="rounded-full object-cover shadow-sm border border-black/5"
            />
            <div className="flex flex-col">
              <span className="font-serif text-lg leading-none tracking-wide text-primary uppercase">Khukuri</span>
              <span className="text-[8px] font-sans font-semibold uppercase tracking-[0.2em] text-primary/60">Restaurant & Fun Villa</span>
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
          <div className="flex items-center gap-4 relative z-50">
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
            
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white hover:bg-black/80 transition-colors lg:hidden"
            >
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-30 bg-background/95 backdrop-blur-md pt-28 px-6 lg:hidden flex flex-col"
          >
            <div className="flex flex-col gap-8 items-center text-center">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-2xl font-serif text-primary hover:text-accent transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              <a
                href="https://wa.me/9779855073719?text=I%20want%20to%20book%20a%20room"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="mt-4 h-14 inline-flex items-center justify-center rounded-full bg-primary px-10 text-sm font-semibold text-white transition-all hover:bg-primary/90"
              >
                Book Now
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
