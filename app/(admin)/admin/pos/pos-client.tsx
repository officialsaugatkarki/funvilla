'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Plus, Minus, Search, ShoppingCart, CreditCard,
  ChefHat, X, Split, Receipt, Trash2, UtensilsCrossed, ListOrdered, CheckCircle2, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { createOrder, processPayment, getActiveOrdersForPOS } from '@/lib/actions/orders.actions'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  categoryName: string | null
  image_url: string | null
  notes: string
}

export default function POSClient({
  categories, items, tables, discounts, initialActiveOrders, taxRate, serviceChargeRate
}: {
  categories: any[]
  items: any[]
  tables: any[]
  discounts: any[]
  initialActiveOrders: any[]
  taxRate: number
  serviceChargeRate: number
}) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [customerName, setCustomerName] = useState('')

  // View modes
  const [posMode, setPosMode] = useState<'new_order' | 'active_orders'>('new_order')
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu')

  // Active Orders state
  const [activeOrders, setActiveOrders] = useState<any[]>(initialActiveOrders)

  // Payment state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [amountPaid, setAmountPaid] = useState<string>('')

  // Split bill
  const [splitBy, setSplitBy] = useState<number>(1)

  // Receipt
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<any>(null)

  // Discount
  const [discountValue, setDiscountValue] = useState<string>('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')

  const [isPending, startTransition] = useTransition()

  // Realtime Orders
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('pos-orders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        // Fetch fresh active orders to ensure accurate calculations and states
        const res = await getActiveOrdersForPOS()
        if (res.data) setActiveOrders(res.data)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === 'all' || item.category_id === selectedCategory
    return matchSearch && matchCat
  })

  function addToCart(item: any) {
    if (posMode !== 'new_order') setPosMode('new_order')
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id)
      if (existing) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        categoryName: (item.menu_categories as any)?.name ?? null,
        image_url: item.image_url,
        notes: ''
      }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart(prev =>
      prev.map(i => i.menuItemId === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter(i => i.quantity > 0)
    )
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  let discountAmount = 0
  const dVal = parseFloat(discountValue) || 0
  if (discountType === 'percent') {
    discountAmount = subtotal * (dVal / 100)
  } else {
    discountAmount = Math.min(dVal, subtotal)
  }

  const postDiscount = Math.max(0, subtotal - discountAmount)
  const tax = Math.round(postDiscount * (taxRate / 100) * 100) / 100
  const serviceCharge = Math.round(postDiscount * (serviceChargeRate / 100) * 100) / 100
  const total = postDiscount + tax + serviceCharge
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  // Payment total calculation based on whether it's a new order or an existing one
  const paymentTotal = currentOrderId ? (activeOrders.find(o => o.id === currentOrderId)?.total ?? total) : total

  useEffect(() => { setAmountPaid(paymentTotal.toFixed(2)) }, [paymentTotal])

  async function handlePlaceOrder() {
    if (cart.length === 0) { toast.error('Add items to the order first'); return }
    if (orderType === 'dine_in' && !selectedTable) { toast.error('Select a table for dine-in orders'); return }

    startTransition(async () => {
      const result = await createOrder({
        tableId: orderType === 'dine_in' ? selectedTable : null,
        orderType,
        customerName: customerName || undefined,
        tipAmount: 0,
        items: cart.map(i => ({
          menuItemId: i.menuItemId,
          menuItemName: i.name,
          menuItemPrice: i.price,
          categoryName: i.categoryName,
          quantity: i.quantity,
          unitPrice: i.price,
          notes: i.notes,
        }))
      })
      if (result.error) { toast.error(result.error); return }
      setCurrentOrderId(result.data!.id)
      setCompletedOrder({ ...result.data, items: cart, subtotal, discountAmount, tax, serviceCharge, total })
      setIsPaymentOpen(true)
      toast.success(`Order #${result.data!.order_number} created!`)
    })
  }

  function handlePayActiveOrder(order: any) {
    setCurrentOrderId(order.id)
    setCompletedOrder({
      ...order,
      items: order.order_items.map((i: any) => ({
        name: i.menu_item_name,
        quantity: i.quantity,
        price: i.unit_price
      })),
      discountAmount: order.discount_amount,
      tax: order.tax_amount,
      serviceCharge: order.service_charge_amount,
      total: order.total
    })
    setIsPaymentOpen(true)
  }

  async function handlePayment() {
    if (!currentOrderId) return
    const paid = parseFloat(amountPaid) || paymentTotal

    startTransition(async () => {
      const result = await processPayment(currentOrderId, paymentMethod, paid)
      if (result.error) { toast.error(result.error); return }
      toast.success('Payment processed!')
      setIsPaymentOpen(false)
      setIsReceiptOpen(true)
      
      // Remove from active orders locally to reflect immediately
      setActiveOrders(prev => prev.filter(o => o.id !== currentOrderId))
    })
  }

  function resetPOS() {
    setCart([])
    setCurrentOrderId(null)
    setCompletedOrder(null)
    setIsReceiptOpen(false)
    setCustomerName('')
    setSelectedTable('')
    setDiscountValue('')
    setSplitBy(1)
    setPosMode('new_order')
    setMobileTab('menu')
  }

  // ── Active Orders Panel ────────────────────────────────────────────────────
  const ActiveOrdersPanel = (
    <div className="flex flex-col h-full bg-background rounded-xl border overflow-hidden">
      <div className="p-4 border-b space-y-3 shrink-0 bg-muted/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <ListOrdered className="h-4 w-4 text-primary" /> Active Orders ({activeOrders.length})
          </h2>
          <Button variant="outline" size="sm" onClick={() => setPosMode('new_order')} className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> New Order
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3">
          {activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm font-medium">No active orders</p>
              <p className="text-xs">All orders have been paid and settled.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeOrders.map(order => (
                <div key={order.id} className="border rounded-lg p-3 hover:shadow-md transition-all bg-card flex flex-col gap-3 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">#{order.order_number}</span>
                        <Badge variant={order.status === 'served' || order.status === 'ready' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 capitalize h-5">
                          {order.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize h-5">
                          {order.order_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {order.restaurant_tables?.table_number && ` • Table ${order.restaurant_tables.table_number}`}
                        {order.customer_name && ` • ${order.customer_name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">NPR {order.total.toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground">{order.order_items?.length || 0} items</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2 border-t mt-1">
                    <Button 
                      size="sm" 
                      onClick={() => handlePayActiveOrder(order)}
                      className="h-8 shadow-sm group-hover:bg-primary/90"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Pay & Settle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )

  // ── New Order Panel content ────────────────────────────────────────────
  const NewOrderPanel = (
    <div className="flex flex-col h-full bg-background rounded-xl border overflow-hidden">
      {/* Order header */}
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <ShoppingCart className="h-4 w-4 text-primary" /> New Order
          </h2>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <Button variant="outline" size="sm" onClick={() => setPosMode('active_orders')} className="h-8">
              <ListOrdered className="h-3.5 w-3.5 mr-1" /> Active
              {activeOrders.length > 0 && (
                <span className="ml-1.5 bg-primary/10 text-primary px-1.5 rounded-full text-[10px] font-bold">
                  {activeOrders.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Order type toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-lg">
          {(['dine_in', 'takeaway'] as const).map(type => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={cn(
                'py-1.5 text-xs rounded-md font-semibold transition-all',
                orderType === type
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {type === 'dine_in' ? 'Dine In' : 'Takeaway'}
            </button>
          ))}
        </div>

        {/* Table selection */}
        {orderType === 'dine_in' && (
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select table *" />
            </SelectTrigger>
            <SelectContent>
              {tables.filter(t => t.status !== 'occupied').map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.table_number} ({t.capacity} seats)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          placeholder="Customer name (optional)"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          className="h-9 text-sm"
        />
      </div>

      {/* Cart items */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
              <ShoppingCart className="h-12 w-12 opacity-15 mb-3" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1">Tap items from the menu to add</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.menuItemId} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">NPR {item.price.toFixed(0)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQty(item.menuItemId, -1)}
                      className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted hover:border-foreground/30 transition-all"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm w-6 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.menuItemId, 1)}
                      className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-sm font-bold w-16 text-right shrink-0 text-primary">
                    {(item.price * item.quantity).toFixed(0)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Totals & checkout */}
      {cart.length > 0 && (
        <div className="p-4 border-t bg-muted/30 space-y-3 shrink-0">
          {/* Discount row */}
          <div className="flex items-center gap-2">
            <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
              <SelectTrigger className="w-28 h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">% Discount</SelectItem>
                <SelectItem value="fixed">Fixed (NPR)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Amount"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              className="h-8 text-xs bg-background flex-1"
            />
          </div>

          {/* Price breakdown */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>NPR {subtotal.toFixed(0)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discount {discountType === 'percent' ? `(${dVal}%)` : ''}</span>
                <span>− NPR {discountAmount.toFixed(0)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({taxRate}%)</span>
                <span>NPR {tax.toFixed(0)}</span>
              </div>
            )}
            {serviceCharge > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Service ({serviceChargeRate}%)</span>
                <span>NPR {serviceCharge.toFixed(0)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg text-primary">
              <span>Total</span>
              <span>NPR {total.toFixed(0)}</span>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handlePlaceOrder}
            disabled={isPending}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            {isPending ? 'Placing Order...' : `Pay NPR ${total.toFixed(0)}`}
          </Button>
        </div>
      )}
    </div>
  )

  const RightPanel = posMode === 'new_order' ? NewOrderPanel : ActiveOrdersPanel

  // ── Shared: Menu Panel content ─────────────────────────────────────────────
  const MenuPanel = (
    <div className="flex flex-col h-full gap-3">
      {/* Search */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 hide-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            'px-3.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all',
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-background'
          )}
        >
          All Items
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all',
              selectedCategory === cat.id
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-background'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <ScrollArea className="flex-1 -mx-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <UtensilsCrossed className="h-10 w-10 opacity-20 mb-3" />
            <p className="text-sm">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 px-1">
            {filtered.map(item => {
              const inCart = cart.find(c => c.menuItemId === item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={cn(
                    'group relative border rounded-xl p-3 text-left transition-all bg-background hover:shadow-md active:scale-[0.97]',
                    inCart
                      ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  {item.image_url ? (
                    <div className="relative h-20 rounded-lg overflow-hidden mb-2 bg-muted">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-20 rounded-lg bg-muted/60 flex items-center justify-center mb-2">
                      <ChefHat className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                  )}
                  <p className="font-medium text-xs leading-tight line-clamp-2 mb-1">{item.name}</p>
                  <p className="text-sm font-bold text-primary">NPR {item.price}</p>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* ── DESKTOP LAYOUT (md+) ────────────────────────────────────────────── */}
      <div className="hidden md:flex h-[calc(100vh-7rem)] gap-4">
        {/* Menu - left */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {MenuPanel}
        </div>
        {/* Order ticket - right */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col">
          {RightPanel}
        </div>
      </div>

      {/* ── MOBILE LAYOUT (< md) ────────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col h-[calc(100vh-7rem)]">
        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-xl mb-3 shrink-0">
          <button
            onClick={() => setMobileTab('menu')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
              mobileTab === 'menu'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <UtensilsCrossed className="h-4 w-4" />
            Menu
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all relative',
              mobileTab === 'cart'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            Order / Active
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-6 bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
            {cartCount === 0 && activeOrders.length > 0 && (
              <span className="absolute top-1.5 right-6 bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {activeOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'menu' ? MenuPanel : RightPanel}
        </div>

        {/* Mobile sticky bottom CTA when on menu tab and cart has items */}
        {mobileTab === 'menu' && cartCount > 0 && (
          <div className="shrink-0 pt-3 pb-2">
            <button
              onClick={() => setMobileTab('cart')}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-between px-4 shadow-lg"
            >
              <span className="bg-primary-foreground/20 text-primary-foreground text-xs font-bold min-w-[24px] h-6 rounded-full flex items-center justify-center px-1.5">
                {cartCount}
              </span>
              <span>View Order</span>
              <span className="font-bold">NPR {total.toFixed(0)}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Payment Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Complete Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="bg-primary/10 rounded-xl p-5 text-center">
              <p className="text-4xl font-bold text-primary">NPR {paymentTotal.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Amount Due</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['cash', 'card', 'esewa', 'khalti'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={cn(
                        'py-3 rounded-xl border text-sm font-semibold capitalize transition-all',
                        paymentMethod === method
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'border-border hover:border-primary/50 bg-background'
                      )}
                    >
                      {method === 'esewa' ? 'eSewa' : method === 'khalti' ? 'Khalti' : method.charAt(0).toUpperCase() + method.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount Tendered</Label>
                <Input
                  type="number"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="h-12 text-xl text-center font-bold"
                />
                {parseFloat(amountPaid) > paymentTotal && (
                  <p className="text-sm text-center text-emerald-600 font-medium">
                    Change: NPR {(parseFloat(amountPaid) - paymentTotal).toFixed(0)}
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Split className="h-3.5 w-3.5" /> Split Bill
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1} max={20}
                    value={splitBy}
                    onChange={e => setSplitBy(parseInt(e.target.value) || 1)}
                    className="h-9 w-24 text-center"
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {splitBy > 1 ? `NPR ${(paymentTotal / splitBy).toFixed(0)} per person` : 'persons'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button className="flex-1 sm:flex-none h-11" onClick={handlePayment} disabled={isPending}>
              {isPending ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Receipt Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={isReceiptOpen} onOpenChange={(open) => { if (!open) resetPOS() }}>
        <DialogContent className="sm:max-w-sm w-[calc(100%-2rem)] rounded-2xl max-h-[90vh] overflow-y-auto">
          <div id="printable-receipt" className="font-mono">
            <div className="text-center space-y-0.5 mb-5">
              <h1 className="text-xl font-bold">Khukuri Restaurant & Resort</h1>
              <p className="text-xs text-muted-foreground">Hetauda, Makwanpur, Nepal</p>
              <p className="text-xs text-muted-foreground">Tel: +977 985-5073719</p>
            </div>

            <div className="text-xs space-y-1 mb-4 border-y border-dashed py-3">
              <div className="flex justify-between"><span>Bill No:</span><span className="font-bold">#{completedOrder?.order_number}</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleString('en-NP', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
              <div className="flex justify-between"><span>Type:</span><span className="capitalize">{completedOrder?.order_type?.replace('_', '-') || 'Dine-in'}</span></div>
              <div className="flex justify-between"><span>Payment:</span><span className="capitalize font-semibold">{paymentMethod}</span></div>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground border-b pb-1">
                <span>Item</span><span>Total</span>
              </div>
              {completedOrder?.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{item.quantity}× {item.name}</span>
                  <span>NPR {(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="text-xs space-y-1 border-t border-dashed pt-3 mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>NPR {completedOrder?.subtotal?.toFixed(0)}</span>
              </div>
              {completedOrder?.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span><span>− NPR {completedOrder?.discountAmount?.toFixed(0)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT ({taxRate}%)</span><span>NPR {completedOrder?.tax?.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                <span>TOTAL</span><span>NPR {completedOrder?.total?.toFixed(0)}</span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">Thank you for visiting Khukuri Resort!</p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={resetPOS}>
              Close & New
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                const el = document.getElementById('printable-receipt')
                if (el) {
                  const w = window.open('', '_blank', 'width=400,height=600')
                  if (w) {
                    w.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;padding:16px;font-size:12px}*{margin:0;padding:0;box-sizing:border-box}.flex{display:flex}.justify-between{justify-content:space-between}.font-bold{font-weight:bold}</style></head><body>${el.innerHTML}</body></html>`)
                    w.document.close()
                    w.print()
                  }
                }
              }}
            >
              <Receipt className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
