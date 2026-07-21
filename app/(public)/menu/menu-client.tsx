'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, Plus, Minus, X, ArrowLeft, CheckCircle2, Loader2, MessageCircle } from 'lucide-react'
import { LayoutContainer } from '@/components/ui/layout-container'
import { useCartStore } from '@/store/cart.store'
import { placeQrOrder } from '@/lib/actions/public-orders.actions'
import { toast } from 'sonner'

const WHATSAPP_NUMBER = '+9779855073719'
const RESTAURANT_SLUG = process.env.NEXT_PUBLIC_RESTAURANT_SLUG || 'khukuri'

export default function MenuClient({ initialMenuData }: { initialMenuData: Record<string, any[]> }) {
  const categories = Object.keys(initialMenuData).filter(c => c !== 'Special' && initialMenuData[c].length > 0)

  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState(categories[0] || '')
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Checkout form state
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState<{ orderId: string; orderNumber: string } | null>(null)

  // Zustand cart store
  const { items: cart, addItem, updateQuantity, getTotalItems, getSubtotal, clearCart } = useCartStore()

  const cartCount = getTotalItems()
  const cartTotal = getSubtotal()

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

  const handleAddToCart = (item: any) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image_url: item.image || null,
      notes: '',
      categoryName: item.categoryName
    })
  }

  async function handlePlaceOrder() {
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setIsPlacingOrder(true)
    try {
      const result = await placeQrOrder({
        restaurantSlug: RESTAURANT_SLUG,
        tableNumber: tableNumber.trim() || undefined,
        customerName: customerName.trim() || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          menuItemName: item.name,
          menuItemPrice: item.price,
          categoryName: item.categoryName ?? null,
          quantity: item.quantity,
          unitPrice: item.price,
          notes: item.notes || undefined,
        })),
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Success!
      setConfirmedOrder(result.data!)
      clearCart()
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  function handleWhatsAppNotify() {
    if (!confirmedOrder) return
    const message = `Hi Khukuri! I just placed Order #${confirmedOrder.orderNumber}${tableNumber ? ` at Table ${tableNumber}` : ''}. Please confirm when it's being prepared. Thank you!`
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encoded}`, '_blank')
  }

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

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center justify-center h-10 w-10 rounded-full bg-primary/5 hover:bg-primary/10 transition-colors"
            aria-label="Open cart"
          >
            <ShoppingBag className="h-4 w-4 text-primary" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent text-primary text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
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
                      <MenuItemCard key={item.id} item={item} onAdd={() => handleAddToCart(item)} />
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
                          <MenuItemCard key={item.id} item={item} onAdd={() => handleAddToCart(item)} />
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

      {/* Floating View Cart (Mobile) */}
      <AnimatePresence>
        {cartCount > 0 && !isCartOpen && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 lg:hidden w-[calc(100%-2rem)] max-w-sm"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-between px-6 font-semibold"
            >
              <div className="flex items-center gap-2">
                <div className="bg-white/20 h-6 w-6 rounded-full flex items-center justify-center text-[10px]">
                  {cartCount}
                </div>
                <span className="text-sm">View Order</span>
              </div>
              <span className="text-sm">NPR {cartTotal}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart / Order Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!isPlacingOrder) setIsCartOpen(false) }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Order Confirmed State */}
              {confirmedOrder ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
                    <CheckCircle2 className="h-20 w-20 text-emerald-500 mx-auto mb-4" />
                  </motion.div>
                  <h2 className="font-serif text-3xl text-primary mb-2">Order Placed!</h2>
                  <p className="text-muted-foreground text-sm mb-4">Your order has been sent to the kitchen.</p>
                  <div className="bg-primary/5 rounded-2xl p-4 mb-6 w-full">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Order Number</p>
                    <p className="font-bold text-2xl text-primary">{confirmedOrder.orderNumber}</p>
                    {tableNumber && (
                      <p className="text-sm text-muted-foreground mt-1">Table {tableNumber}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">
                    Show this number to your server if needed. We'll prepare your food shortly!
                  </p>
                  <button
                    onClick={handleWhatsAppNotify}
                    className="w-full h-12 border border-green-500 text-green-600 rounded-full flex items-center justify-center gap-2 hover:bg-green-50 transition-colors font-semibold text-sm mb-3"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Notify via WhatsApp (optional)
                  </button>
                  <button
                    onClick={() => { setConfirmedOrder(null); setIsCartOpen(false); setTableNumber(''); setCustomerName(''); setSpecialInstructions('') }}
                    className="w-full h-12 bg-primary text-white rounded-full font-semibold text-sm hover:bg-primary/90 transition-colors"
                  >
                    Continue Browsing
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-6 border-b border-black/5">
                    <h2 className="font-serif text-2xl text-primary">Your Order</h2>
                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors" aria-label="Close">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-foreground/40 space-y-4">
                        <ShoppingBag className="h-12 w-12 opacity-50" />
                        <p>Your cart is empty.</p>
                      </div>
                    ) : (
                      <>
                        {/* Cart Items */}
                        {cart.map(item => (
                          <div key={item.menuItemId} className="flex gap-4">
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-secondary/50">
                              {item.image_url ? (
                                <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary/40 text-xs font-medium">
                                  {item.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <p className="font-semibold text-primary text-sm line-clamp-2">{item.name}</p>
                                <p className="text-accent font-serif mt-1">NPR {item.price}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                                  className="h-7 w-7 flex items-center justify-center rounded-full border border-black/10 hover:bg-black/5"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                                  className="h-7 w-7 flex items-center justify-center rounded-full border border-black/10 hover:bg-black/5"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="text-right font-semibold text-sm shrink-0">
                              NPR {item.price * item.quantity}
                            </div>
                          </div>
                        ))}

                        {/* Order Details Form */}
                        <div className="pt-4 border-t border-black/5 space-y-3">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                              Table Number <span className="text-primary/40">(optional)</span>
                            </label>
                            <input
                              type="text"
                              value={tableNumber}
                              onChange={e => setTableNumber(e.target.value)}
                              placeholder="e.g. 5"
                              className="w-full h-10 px-3 rounded-xl border border-black/10 text-sm outline-none focus:border-primary/30 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                              Your Name <span className="text-primary/40">(optional)</span>
                            </label>
                            <input
                              type="text"
                              value={customerName}
                              onChange={e => setCustomerName(e.target.value)}
                              placeholder="e.g. Ram Bahadur"
                              className="w-full h-10 px-3 rounded-xl border border-black/10 text-sm outline-none focus:border-primary/30 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                              Special Instructions <span className="text-primary/40">(optional)</span>
                            </label>
                            <textarea
                              value={specialInstructions}
                              onChange={e => setSpecialInstructions(e.target.value)}
                              placeholder="e.g. No spice, extra sauce..."
                              rows={2}
                              className="w-full px-3 py-2 rounded-xl border border-black/10 text-sm outline-none focus:border-primary/30 transition-colors resize-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div className="p-6 border-t border-black/5 bg-background space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold uppercase tracking-wider text-primary/60">Total Amount</span>
                        <span className="font-serif text-3xl text-primary">NPR {cartTotal}</span>
                      </div>

                      <button
                        onClick={handlePlaceOrder}
                        disabled={isPlacingOrder}
                        className="w-full h-14 bg-primary text-white rounded-full flex items-center justify-center gap-2 hover:bg-primary/90 transition-all font-semibold uppercase tracking-wider text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isPlacingOrder ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Placing Order...
                          </>
                        ) : (
                          'Place Order'
                        )}
                      </button>
                      <p className="text-center text-xs text-muted-foreground">
                        Your order goes directly to the kitchen
                      </p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuItemCard({ item, onAdd }: { item: any; onAdd: () => void }) {
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

      <div className="flex flex-col justify-between flex-1 py-1">
        <div>
          <h4 className="font-semibold text-primary text-sm sm:text-base leading-snug line-clamp-2">
            {item.name}
          </h4>
          <p className="font-serif text-lg text-accent mt-1">NPR {item.price}</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onAdd}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/5 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
            aria-label={`Add ${item.name} to cart`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
