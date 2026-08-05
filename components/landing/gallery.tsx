'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

// Consistent aspect ratios for gallery masonry
const galleryImages = [
  { src: '/assets/IMG_0891.jpeg', alt: 'Khukuri Fun Villa Gallery 1', aspect: 'aspect-[3/4]' },
  { src: '/assets/IMG_0892.jpeg', alt: 'Khukuri Fun Villa Gallery 2', aspect: 'aspect-[4/3]' },
  { src: '/assets/IMG_0894.jpeg', alt: 'Khukuri Fun Villa Gallery 3', aspect: 'aspect-[3/4]' },
  { src: '/assets/IMG_0895.jpeg', alt: 'Khukuri Fun Villa Gallery 4', aspect: 'aspect-[4/3]' },
  { src: '/assets/IMG_0900.jpeg', alt: 'Khukuri Fun Villa Gallery 5', aspect: 'aspect-[3/4]' },
  { src: '/assets/IMG_0902.jpeg', alt: 'Khukuri Fun Villa Gallery 6', aspect: 'aspect-[4/3]' },
]

export function Gallery() {
  return (
    <section id="gallery" className="py-14">
      {/* Header — tighter mb */}
      <div className="text-center mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent mb-3">Gallery</p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-primary leading-[1.1]">
          Moments at Khukuri.
        </h2>
      </div>

      {/* Grid Layout — replacing columns to prevent stretching/clipping */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {galleryImages.map((img, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '80px' }}
            transition={{ delay: (index % 3) * 0.15, duration: 0.7 }}
            className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden group bg-black cursor-pointer"
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
              className="object-cover opacity-85 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </motion.div>
        ))}
      </div>

    </section>
  )
}
