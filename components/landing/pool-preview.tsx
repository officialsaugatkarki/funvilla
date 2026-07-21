'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Droplets, Info } from 'lucide-react'
import { PoolPackageForm } from './pool-package-form'

const poolFeatures = [
  { name: 'Adult Pool', image: '/assets/IMG_0900.jpeg' },
  { name: 'Kids Pool', image: '/assets/IMG_0891.jpeg' },
  { name: 'Slides & Fun', image: '/assets/IMG_0892.jpeg' },
  { name: 'Relaxation Area', image: '/assets/IMG_0894.jpeg' },
]

export function PoolPreview() {
  return (
    <section id="pool" className="py-14 bg-secondary/30 rounded-[2rem]">
      <div className="px-8 sm:px-12 text-center mb-10">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-3">Swimming Pool</p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-primary leading-[1.1] mb-4">
          Dive into Relaxation.
        </h2>
        <p className="text-foreground/65 text-base font-light max-w-xl mx-auto">
          Whether you're looking for an exhilarating ride on our slides or a peaceful afternoon by the water, our pool area offers the perfect escape for all ages.
        </p>
      </div>

      <div className="px-8 sm:px-12 grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="grid grid-cols-2 gap-3">
          {poolFeatures.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.7 }}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden group bg-white shadow-sm"
            >
              <Image
                src={feature.image}
                alt={feature.name}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
              <div className="absolute bottom-3 left-4 text-white">
                <p className="font-serif text-base">{feature.name}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="flex flex-col gap-4 h-full"
        >
          {/* Day Pass Pricing */}
          <div className="bg-primary rounded-2xl p-6 text-white shadow-lg">
            <Droplets className="h-8 w-8 text-accent mb-5" />
            <h3 className="font-serif text-2xl mb-4">Day Pass Pricing</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/20 pb-3">
                <div>
                  <p className="font-medium text-base">Adults</p>
                  <p className="text-[11px] text-white/55">Age 12 and above</p>
                </div>
                <p className="font-serif text-xl text-accent">NPR 200</p>
              </div>

              <div className="flex justify-between items-end border-b border-white/20 pb-3">
                <div>
                  <p className="font-medium text-base">Kids</p>
                  <p className="text-[11px] text-white/55">Under 12 years</p>
                </div>
                <p className="font-serif text-xl text-accent">NPR 150</p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2.5 bg-white/10 p-3 rounded-xl">
              <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/75 leading-relaxed">
                Proper swimwear required. Lockers and towels available. Children must be supervised.
              </p>
            </div>
          </div>

          {/* Swimming Training Packages */}
          <div className="bg-accent/10 border border-accent/20 rounded-2xl p-6 shadow-sm">
            <h3 className="font-serif text-xl text-primary mb-4">Swimming Training</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-2 border-b border-black/10 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-primary">15 Days Package</p>
                    <p className="text-xs text-foreground/60">For everyone</p>
                  </div>
                  <p className="font-serif text-lg text-primary">Rs. 4,000</p>
                </div>
                <PoolPackageForm
                  packageName="15 Days Package"
                  price={4000}
                  trigger={
                    <button className="w-full h-8 rounded-lg bg-primary text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors">
                      Book 15 Days
                    </button>
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-primary">30 Days Package</p>
                    <p className="text-xs text-foreground/60">For everyone</p>
                  </div>
                  <p className="font-serif text-lg text-primary">Rs. 8,000</p>
                </div>
                <PoolPackageForm
                  packageName="30 Days Package"
                  price={8000}
                  trigger={
                    <button className="w-full h-8 rounded-lg bg-primary text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors">
                      Book 30 Days
                    </button>
                  }
                />
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </section>
  )
}
