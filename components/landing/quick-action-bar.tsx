'use client'

import { motion } from 'framer-motion'
import { MapPin, Calendar, User, ChevronDown, Search } from 'lucide-react'

export function QuickActionBar() {
  return (
    // Reduced vertical padding. Tighter gap on mobile columns.
    <div className="w-full mt-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="w-full rounded-2xl lg:rounded-full bg-white shadow-lg shadow-black/5 border border-black/5 px-4 py-3 lg:py-2"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-0">

          {/* Field 1 */}
          <div className="flex-1 flex flex-col px-2 lg:px-4 lg:border-r border-black/8">
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mb-0.5">What are you looking for?</span>
            <div className="flex items-center justify-between gap-2">
              <input type="text" placeholder="e.g. Restaurant, Pool, Room..." className="text-xs outline-none placeholder:text-foreground/40 w-full bg-transparent" />
              <MapPin className="h-3.5 w-3.5 text-foreground/30 shrink-0" />
            </div>
          </div>

          {/* Field 2 */}
          <div className="flex-1 flex flex-col px-2 lg:px-4 lg:border-r border-black/8">
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mb-0.5">Check In / Date</span>
            <div className="flex items-center justify-between gap-2">
              <input type="text" placeholder="Add Date" className="text-xs outline-none placeholder:text-foreground/40 w-full bg-transparent" />
              <Calendar className="h-3.5 w-3.5 text-foreground/30 shrink-0" />
            </div>
          </div>

          {/* Field 3 */}
          <div className="flex-1 flex flex-col px-2 lg:px-4 lg:border-r border-black/8">
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mb-0.5">Guests / People</span>
            <div className="flex items-center justify-between gap-2">
              <input type="text" placeholder="Add Guests" className="text-xs outline-none placeholder:text-foreground/40 w-full bg-transparent" />
              <User className="h-3.5 w-3.5 text-foreground/30 shrink-0" />
            </div>
          </div>

          {/* Field 4 */}
          <div className="flex-1 flex flex-col px-2 lg:px-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mb-0.5">Type</span>
            <div className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-xs text-foreground/50">All Categories</span>
              <ChevronDown className="h-3.5 w-3.5 text-foreground/30 shrink-0" />
            </div>
          </div>

          {/* Search Button */}
          <div className="flex-shrink-0 lg:pl-3">
            <button className="w-full lg:w-12 lg:h-12 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors px-6 lg:px-0 gap-2">
              <Search className="h-4 w-4" />
              <span className="text-xs font-semibold lg:hidden">Search</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
