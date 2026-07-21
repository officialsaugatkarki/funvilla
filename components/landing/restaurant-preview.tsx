'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const specials = [
  { name: 'Tawa Pork', price: '400', image: '/images/tawapork.jpeg' },
  { name: 'Chicken Biryani', price: '500', image: '/images/mutton biryani.jpg' },
  { name: 'Grilled Fish', price: '600', image: '/images/grilledfish.jpeg' },
]

export function RestaurantPreview() {
  return (
    <section id="restaurant" className="py-14">
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-14 items-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-3">The Restaurant</p>
          {/* Heading: 6xl → 4xl/5xl */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-primary leading-[1.1] mb-4">
            A Culinary Journey in Nature.
          </h2>
          <p className="text-foreground/65 text-base font-light mb-7 leading-relaxed">
            Discover a menu crafted with passion, featuring fresh ingredients, rich flavors, and authentic recipes. From local Nepali delicacies to international favorites, there's something to delight every palate.
          </p>

          <Link
            href="/menu"
            className="group inline-flex h-11 items-center gap-3 rounded-full bg-primary px-7 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-primary/90"
          >
            Open Digital Menu
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1">
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent/10 rounded-full blur-3xl -z-10" />

          <div className="space-y-4 sm:mt-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative aspect-[3/4] rounded-[1.5rem] overflow-hidden group bg-white shadow-md"
            >
              <Image src={specials[0].image} alt={specials[0].name} fill className="object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-[9px] font-bold uppercase tracking-wider text-accent mb-0.5">Chef's Special</p>
                <p className="font-serif text-base">{specials[0].name}</p>
              </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="relative aspect-[3/4] rounded-[1.5rem] overflow-hidden group bg-white shadow-md"
            >
              <Image src={specials[1].image} alt={specials[1].name} fill className="object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-[9px] font-bold uppercase tracking-wider text-accent mb-0.5">Popular</p>
                <p className="font-serif text-base">{specials[1].name}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="relative aspect-[16/10] rounded-[1.5rem] overflow-hidden group bg-white shadow-md"
            >
              <Image src={specials[2].image} alt={specials[2].name} fill className="object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-[9px] font-bold uppercase tracking-wider text-accent mb-0.5">Local Favorite</p>
                <p className="font-serif text-base">{specials[2].name}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
