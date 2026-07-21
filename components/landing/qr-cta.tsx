'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, QrCode } from 'lucide-react'

export function QRCta() {
  return (
    // py-8 (was py-16) — compact pill
    <section id="qr-menu" className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="w-full bg-[#1A231E] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0">
            <QrCode className="h-full w-full text-black" strokeWidth={1} />
          </div>
          <div>
            <h3 className="text-white text-base font-semibold mb-0.5">
              Scan QR to View Our Digital Menu
            </h3>
            <p className="text-white/55 text-xs">
              Order from your table or browse our mouth-watering dishes.
            </p>
          </div>
        </div>

        <Link
          href="/menu"
          className="w-full md:w-auto h-10 inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-7 text-xs font-semibold text-primary transition-all hover:bg-white/90 shrink-0"
        >
          View Menu
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>
    </section>
  )
}
