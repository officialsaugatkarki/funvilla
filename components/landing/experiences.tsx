'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Utensils, Droplets, Bed, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'

const experiences = [
  {
    id: 'restaurant',
    title: 'Delicious Food\nMade Fresh Daily',
    category: 'RESTAURANT',
    image: '/assets/IMG_0888.jpeg',
    href: '/menu',
    cta: 'Explore Menu',
  },
  {
    id: 'pool',
    title: 'Relax. Swim. Refresh.\nFun for Everyone',
    category: 'SWIMMING POOL',
    image: '/assets/IMG_0900.jpeg',
    href: '#pool',
    cta: 'Learn More',
  },
  {
    id: 'rooms',
    title: 'Comfortable Rooms\nPeaceful Stay',
    category: 'ROOMS & STAY',
    image: '/assets/IMG_1105.jpeg',
    href: '#rooms',
    cta: 'View Rooms',
  },
  {
    id: 'events',
    title: 'Events & Parties\nWe Make it Special',
    category: 'EVENTS & PARTIES',
    image: '/assets/img1.jpeg',
    href: '#events',
    cta: 'Plan Your Event',
  },
]

export function Experiences() {
  return (
    // Section spacing: pt-16 pb-12 (was pt-24 pb-16)
    <section id="experiences" className="bg-background pt-14 pb-10">

      {/* Header row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-1.5 w-1.5 bg-accent rounded-full animate-pulse" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary/50">Our Experiences</p>
          </div>
          {/* Heading: 5xl → 4xl/5xl */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-primary leading-[1.1]">
            Everything You Need,<br className="hidden sm:block" /> All in One Place.
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white rounded-2xl lg:rounded-full p-1.5 border border-black/5 shadow-sm overflow-x-auto hide-scrollbar">
          <button className="flex items-center gap-1.5 h-8 px-4 rounded-full bg-primary text-white text-[11px] font-semibold whitespace-nowrap">
            <LayoutGrid className="h-3.5 w-3.5" /> All
          </button>
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-primary hover:bg-black/5 text-[11px] font-semibold transition-colors whitespace-nowrap">
            <Utensils className="h-3.5 w-3.5" /> Restaurant
          </button>
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-primary hover:bg-black/5 text-[11px] font-semibold transition-colors whitespace-nowrap">
            <Droplets className="h-3.5 w-3.5" /> Swimming Pool
          </button>
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-primary hover:bg-black/5 text-[11px] font-semibold transition-colors whitespace-nowrap">
            <Bed className="h-3.5 w-3.5" /> Rooms &amp; Stay
          </button>
        </div>

        {/* Arrow controls */}
        <div className="hidden lg:flex gap-2">
          <button className="h-9 w-9 flex items-center justify-center rounded-full border border-black/10 text-primary hover:bg-primary hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 flex items-center justify-center rounded-full border border-black/10 text-primary hover:bg-primary hover:text-white transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards grid — height reduced from 380px to 300px */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {experiences.map((exp, index) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08, duration: 0.7 }}
            className="group relative h-[300px] w-full overflow-hidden rounded-[1.25rem] bg-black cursor-pointer"
          >
            <Image
              src={exp.image}
              alt={exp.category}
              fill
              className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-between p-5">
              <div className="self-start rounded-full bg-white/10 backdrop-blur-md px-2.5 py-0.5 border border-white/20">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white">{exp.category}</span>
              </div>

              <div>
                <h3 className="font-serif text-lg text-white mb-3 leading-snug whitespace-pre-line">{exp.title}</h3>
                <Link
                  href={exp.href}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/80 group-hover:text-white transition-colors"
                >
                  {exp.cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
