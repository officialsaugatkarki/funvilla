'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function About() {
  return (
    // py reduced via Section override. Gap tightened from gap-16 to gap-10
    <section id="about" className="py-14">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="relative">
          <div className="absolute -inset-3 bg-secondary rounded-[2.5rem] -z-10" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="relative aspect-[4/5] w-full max-w-sm mx-auto lg:max-w-none rounded-[2rem] overflow-hidden"
          >
            <Image
              src="/assets/IMG_0891.jpeg"
              alt="Khukuri Restaurant and Resort"
              fill
              className="object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-lg max-w-[180px]"
          >
            <div className="text-3xl font-serif text-accent mb-1">10+</div>
            <p className="text-xs text-foreground/65 font-medium leading-snug">Years of Hospitality Excellence</p>
          </motion.div>
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-3">About Khukuri</p>
          {/* Heading: 6xl → 4xl/5xl */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-primary leading-[1.1] mb-5">
            More than a restaurant, it's a destination.
          </h2>
          <div className="space-y-4 text-foreground/65 text-base font-light">
            <p>
              Nestled in the heart of nature, Khukuri Restaurant &amp; Resort offers a sanctuary for those seeking exceptional dining, relaxing stays, and unforgettable family moments.
            </p>
            <p>
              Whether you are here to savor our Chef's signature dishes, unwind by the crystal-clear swimming pool, or celebrate a milestone event, we ensure every detail is crafted to perfection.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="#experiences"
              className="inline-flex items-center gap-2.5 text-primary font-semibold uppercase tracking-wider text-xs hover:opacity-70 transition-opacity"
            >
              Discover Our Spaces
              <div className="p-1.5 bg-secondary rounded-full">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
