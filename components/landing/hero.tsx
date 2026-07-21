'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Play, MapPin, Clock } from 'lucide-react'

export function Hero() {
  return (
    // Height reduced: 75vh → 70vh. min-h tightened: 600 → 560. mt-6 kept for breathing room.
    <section className="relative w-full rounded-[2rem] overflow-hidden bg-black h-[70vh] min-h-[560px] mt-4 shadow-2xl">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/IMG_0894.jpeg"
          alt="Khukuri Resort View"
          fill
          priority
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-black/60" />
      </div>

      {/* Giant Background Text — scaled down for proportion */}
      <div className="absolute inset-x-0 top-2 lg:top-4 z-0 flex justify-center pointer-events-none opacity-70 mix-blend-overlay">
        <h1 className="font-serif text-[13vw] leading-none tracking-tight text-white select-none">
          KHUKURI
        </h1>
      </div>

      <div className="relative z-10 w-full h-full p-5 sm:p-8 lg:p-12 flex flex-col justify-between">
        
        {/* Top Right Info Badges */}
        <div className="absolute top-5 right-5 lg:top-8 lg:right-8 hidden md:flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-md text-white text-[10px]">
            <Clock className="h-3 w-3" />
            <span>8:00 AM – 10:00 PM</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-md text-white text-[10px]">
            <MapPin className="h-3 w-3" />
            <span>Hetauda, Nepal</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center max-w-xl mt-8 lg:mt-0">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-3 flex items-center gap-2 text-accent"
          >
            <div className="h-1.5 w-1.5 bg-accent rounded-full animate-pulse" />
            <span className="text-[10px] font-semibold tracking-widest uppercase">Experience Nature &amp; Hospitality</span>
          </motion.div>

          {/* Heading: 7xl was too big — refined to 5xl/6xl */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.08] text-white tracking-tight"
          >
            Good Food.<br />
            Great Views.<br />
            Better Memories.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-4 text-sm text-white/75 max-w-sm font-light leading-relaxed"
          >
            A perfect blend of delicious cuisine, relaxing swimming, and comfortable stay — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-7 flex flex-wrap items-center gap-4"
          >
            <Link
              href="#explore"
              className="group flex h-11 items-center gap-2.5 rounded-full bg-white px-5 text-[11px] font-bold uppercase tracking-wider text-primary transition-all hover:bg-white/90"
            >
              Explore Khukuri
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white transition-transform group-hover:translate-x-1">
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>

            <button className="flex items-center gap-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur-sm">
                <Play className="h-3.5 w-3.5 fill-white" />
              </div>
              Watch Video
            </button>
          </motion.div>
        </div>

        {/* Bottom Area */}
        <div className="w-full flex justify-between items-end">
          {/* Slider dots indicator */}
          <div className="flex gap-2 items-center">
            <button className="text-white/60 hover:text-white"><ArrowRight className="h-3.5 w-3.5 rotate-180" /></button>
            <div className="w-6 h-0.5 bg-white rounded-full" />
            <div className="w-6 h-0.5 bg-white/30 rounded-full" />
            <div className="w-6 h-0.5 bg-white/30 rounded-full" />
            <div className="w-6 h-0.5 bg-white/30 rounded-full" />
            <button className="text-white/60 hover:text-white"><ArrowRight className="h-3.5 w-3.5" /></button>
          </div>

          {/* Floating Image Card — tightened sizing */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="hidden lg:block rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md text-white w-64 shadow-2xl"
          >
            <h3 className="font-serif text-lg leading-snug mb-3">Escape. Relax.<br/>Enjoy.</h3>
            <div className="flex gap-2">
              <div className="relative w-full h-16 rounded-lg overflow-hidden">
                <Image src="/assets/IMG_0900.jpeg" fill alt="Pool" className="object-cover" />
              </div>
              <div className="relative w-full h-16 rounded-lg overflow-hidden">
                <Image src="/assets/IMG_0902.jpeg" fill alt="Room" className="object-cover" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
