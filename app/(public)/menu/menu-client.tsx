'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, ArrowLeft } from 'lucide-react'
import { LayoutContainer } from '@/components/ui/layout-container'

export default function MenuClient({ initialMenuData }: { initialMenuData: Record<string, any[]> }) {
  const categories = Object.keys(initialMenuData).filter(c => c !== 'Special' && initialMenuData[c].length > 0)

  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState(categories[0] || '')

  const filteredMenu = useMemo(() => {
    if (!searchTerm) return null
    const term = searchTerm.toLowerCase()
    const results: { category: string; items: any[] }[] = []
    Object.entries(initialMenuData).forEach(([category, items]) => {
      const matched = items.filter(item =>
        item.name.toLowerCase().includes(term) || category.toLowerCase().includes(term)
      )
      if (matched.length > 0) results.push({ category, items: matched })
    })
    return results
  }, [searchTerm, initialMenuData])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-black/5">
        <LayoutContainer className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Back</span>
          </Link>

          <span className="font-serif text-xl tracking-widest uppercase text-primary">Our Menu</span>
          
          {/* Spacer to keep 'Our Menu' centered */}
          <div className="w-16"></div>
        </LayoutContainer>
      </header>

      {/* Hero / Search Area */}
      <LayoutContainer className="pt-10 pb-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-serif text-primary leading-[1.1] mb-4">
            Discover Our Flavors
          </h1>
          <p className="text-foreground/60 text-sm font-light mb-8 max-w-md mx-auto">
            From local Nepali delicacies to refreshing beverages — crafted with passion.
          </p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <input
              type="text"
              placeholder="Search for dishes or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 rounded-full border border-black/10 bg-white/50 pl-11 pr-4 text-sm outline-none focus:border-primary/30 focus:bg-white transition-all shadow-sm"
            />
          </div>
        </div>
      </LayoutContainer>

      {/* Main Content */}
      <LayoutContainer className="pb-24">
        {searchTerm && filteredMenu ? (
          <div className="space-y-12">
            {filteredMenu.length === 0 ? (
              <div className="text-center py-20 text-foreground/50">
                <p>No items found for "{searchTerm}"</p>
              </div>
            ) : (
              filteredMenu.map((section) => (
                <div key={section.category}>
                  <h3 className="font-serif text-2xl text-primary mb-6 border-b border-black/5 pb-2">
                    {section.category}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {section.items.map((item: any) => (
                      <MenuItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative">
            {/* Desktop Sidebar Categories */}
            {categories.length > 0 && (
              <div className="hidden lg:block w-64 shrink-0">
                <div className="sticky top-24 bg-white rounded-[2rem] p-6 shadow-sm border border-black/5 max-h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-4">Categories</h3>
                  <nav className="flex flex-col gap-1">
                    {categories.map(cat => (
                      <a
                        key={cat}
                        href={`#cat-${cat}`}
                        onClick={(e) => {
                          e.preventDefault()
                          setActiveCategory(cat)
                          document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        className={`text-left px-4 py-2.5 rounded-full text-xs font-semibold transition-colors ${
                          activeCategory === cat ? 'bg-primary text-white' : 'text-foreground/70 hover:bg-black/5'
                        }`}
                      >
                        {cat}
                      </a>
                    ))}
                  </nav>
                </div>
              </div>
            )}

            {/* Mobile Categories Scroll */}
            {categories.length > 0 && (
              <div className="lg:hidden sticky top-16 z-30 bg-background/95 backdrop-blur-md py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-black/5">
                <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setActiveCategory(cat)
                        document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-semibold transition-colors border ${
                        activeCategory === cat ? 'bg-primary text-white border-primary' : 'bg-white text-foreground/70 border-black/10 hover:border-black/20'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Items List */}
            <div className="flex-1 space-y-16">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-3xl bg-white/50">
                  <h3 className="font-serif text-2xl text-primary mb-2">Menu Coming Soon</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">We are currently curating our digital menu. Please check back later.</p>
                </div>
              ) : (
                categories.map(cat => {
                  const items = initialMenuData[cat]
                  if (!items || items.length === 0) return null
                  return (
                    <div key={cat} id={`cat-${cat}`} className="scroll-mt-36">
                      <h2 className="font-serif text-3xl text-primary mb-6 flex items-center gap-3">
                        {cat}
                        <div className="flex-1 h-px bg-black/5" />
                      </h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                        {items.map((item: any) => (
                          <MenuItemCard key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </LayoutContainer>
    </div>
  )
}

function MenuItemCard({ item }: { item: any }) {
  return (
    <div className="group flex gap-4 p-3 pr-4 rounded-[1.5rem] bg-white border border-black/5 shadow-sm hover:shadow-md transition-all">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 bg-secondary/50">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="120px"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/20 text-2xl font-serif">
            {item.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center flex-1 py-1">
        <div>
          <h4 className="font-semibold text-primary text-sm sm:text-base leading-snug line-clamp-2">
            {item.name}
          </h4>
          <p className="font-serif text-lg text-accent mt-1">NPR {item.price}</p>
        </div>
      </div>
    </div>
  )
}
