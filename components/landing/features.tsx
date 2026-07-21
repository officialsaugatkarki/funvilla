'use client'

import { motion } from 'framer-motion'
import { Utensils, ShieldCheck, Users, Tag } from 'lucide-react'

const features = [
  { icon: Utensils, title: 'Fresh & Delicious', desc: 'Quality ingredients, perfectly cooked.' },
  { icon: ShieldCheck, title: 'Clean & Safe', desc: 'Hygienic kitchen, clean environment.' },
  { icon: Users, title: 'Friendly Staff', desc: 'Warm welcome and great hospitality.' },
  { icon: Tag, title: 'Best Price', desc: 'Affordable prices, great value.' },
]

export function Features() {
  return (
    // py-10 (was py-16), mt-10 (was mt-16), tighter gap
    <section id="features" className="bg-background py-10 border-t border-black/5 mt-10">
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-20">

        <div className="lg:w-1/3">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-1.5 bg-accent rounded-full animate-pulse" />
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary/50">Why Choose Khukuri</p>
          </div>
          {/* Heading: 4xl → 3xl/3.5xl */}
          <h2 className="text-2xl sm:text-3xl font-serif text-primary leading-[1.2] mb-4">
            More Than a Restaurant,<br />It's an Experience.
          </h2>
          <p className="text-foreground/60 text-sm leading-relaxed">
            Quality food, great service and unforgettable moments await you with us.
          </p>
        </div>

        <div className="lg:w-2/3 grid grid-cols-2 gap-x-8 gap-y-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.6 }}
              className="flex flex-col gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/5 text-primary">
                <feature.icon className="h-4.5 w-4.5 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-primary mb-0.5">{feature.title}</h3>
                <p className="text-xs text-foreground/55 leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
