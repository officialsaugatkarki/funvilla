'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Minus, Search, ShoppingCart, CreditCard, ChefHat, X, Split, Receipt, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import { createOrder, processPayment } from '@/lib/actions/orders.actions'
import { createClient } from '@/lib/supabase/client'

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
  categories, items, tables, discounts, taxRate, serviceChargeRate
}: {
  categories: any[]
  items: any[]
  tables: any[]
  discounts: any[]
  taxRate: number
  serviceChargeRate: number
}) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [customerName, setCustomerName] = useState('')
  
  // Payment state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [amountPaid, setAmountPaid] = useState<string>('')
  
  // Split bill state
  const [splitBy, setSplitBy] = useState<number>(1)

  // Receipt state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<any>(null)
  
  // Discount state
  const [discountValue, setDiscountValue] = useState<string>('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')

  const [isPending, startTransition] = useTransition()

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('pos-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload: any) => {
        console.log('New order inserted:', payload)
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
  
  // Calculate discount
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

  // Set default amount paid when total changes
  useEffect(() => {
    setAmountPaid(total.toString())
  }, [total])

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
      setCompletedOrder({
        ...result.data,
        items: cart,
        subtotal,
        discountAmount,
        tax,
        serviceCharge,
        total
      })
      setIsPaymentOpen(true)
      toast.success(`Order #${result.data!.order_number} created!`)
    })
  }

  async function handlePayment() {
    if (!currentOrderId) return
    const paid = parseFloat(amountPaid) || total
    
    startTransition(async () => {
      const result = await processPayment(currentOrderId, paymentMethod, paid)
      if (result.error) { toast.error(result.error); return }
      toast.success(paid < total ? 'Partial payment recorded' : 'Payment processed successfully!')
      
      setIsPaymentOpen(false)
      setIsReceiptOpen(true) // Open receipt
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
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left: Menu Items */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selectedCategory === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'}`}
          >All</button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selectedCategory === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'}`}
            >{cat.name}</button>
          ))}
        </div>

        {/* Item Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 pr-2">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="group border rounded-xl p-3 text-left hover:border-primary hover:shadow-sm transition-all bg-background"
              >
                {item.image_url ? (
                  <div className="relative h-24 rounded-lg overflow-hidden mb-2">
                    <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-24 rounded-lg bg-muted flex items-center justify-center mb-2">
                    <ChefHat className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <p className="font-medium text-sm leading-tight line-clamp-2">{item.name}</p>
                <p className="text-sm text-primary font-semibold mt-1">NPR {item.price}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Order Ticket */}
      <div className="w-80 lg:w-96 shrink-0 flex flex-col border rounded-xl bg-background">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> New Order
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Order Type */}
          <div className="flex gap-2">
            {(['dine_in', 'takeaway'] as const).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors capitalize ${orderType === type ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'}`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Table selection */}
          {orderType === 'dine_in' && (
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select table *" /></SelectTrigger>
              <SelectContent>
                {tables.filter(t => t.status !== 'occupied').map(t => (
                  <SelectItem key={t.id} value={t.id}>Table {t.table_number} ({t.capacity} seats)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Customer name */}
          <Input
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12 text-center">
              <ShoppingCart className="h-10 w-10 opacity-20 mb-2" />
              <p className="text-sm">Add items from the menu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.menuItemId} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">NPR {item.price}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQty(item.menuItemId, -1)}
                      className="h-6 w-6 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs w-5 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.menuItemId, 1)}
                      className="h-6 w-6 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold w-16 text-right shrink-0">NPR {item.price * item.quantity}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totals & Checkout */}
        {cart.length > 0 && (
          <div className="p-4 border-t space-y-3 bg-muted/20">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger className="w-24 h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent %</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                type="number" 
                placeholder="Discount" 
                value={discountValue} 
                onChange={e => setDiscountValue(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>NPR {subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount</span><span>- NPR {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({taxRate}%)</span><span>NPR {tax.toFixed(2)}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Chg ({serviceChargeRate}%)</span><span>NPR {serviceCharge.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg text-primary">
                <span>Total</span><span>NPR {total.toFixed(2)}</span>
              </div>
            </div>
            <Button className="w-full h-12 text-base" onClick={handlePlaceOrder} disabled={isPending}>
              <CreditCard className="mr-2 h-5 w-5" />
              {isPending ? 'Placing Order...' : 'Pay Now'}
            </Button>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Complete Payment</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="bg-muted rounded-xl p-6 text-center">
              <p className="text-4xl font-bold text-primary">NPR {total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Amount Due</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Amount Paid</Label>
                <Input 
                  type="number" 
                  value={amountPaid} 
                  onChange={e => setAmountPaid(e.target.value)} 
                  className="h-12 text-lg text-center font-semibold"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['cash', 'card', 'esewa', 'khalti'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-3 rounded-lg border text-sm font-medium capitalize transition-colors ${paymentMethod === method ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border hover:border-foreground bg-background'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 col-span-2 border-t pt-4 mt-2">
                <Label className="flex items-center gap-2"><Split className="h-4 w-4"/> Split Bill?</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="number" 
                    min={1} 
                    max={20}
                    value={splitBy} 
                    onChange={e => setSplitBy(parseInt(e.target.value) || 1)} 
                  />
                  {splitBy > 1 && (
                    <span className="text-sm font-medium shrink-0">
                      NPR {(total / splitBy).toFixed(2)} each
                    </span>
                  )}
                </div>
              </div>

            </div>
            
            <DialogFooter className="sm:justify-end">
              <Button className="w-full sm:w-auto" size="lg" onClick={handlePayment} disabled={isPending}>
                {isPending ? 'Processing...' : `Confirm Payment`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Printable Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={(open) => {
        if (!open) resetPOS()
      }}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <div className="print-content" id="printable-receipt">
            <div className="text-center space-y-1 mb-6">
              <h1 className="text-2xl font-bold tracking-tight">Khukuri Restaurant</h1>
              <p className="text-sm text-muted-foreground">Kathmandu, Nepal</p>
              <p className="text-sm text-muted-foreground">PAN: 123456789</p>
            </div>
            
            <div className="text-sm space-y-1 mb-6 border-b pb-4 border-dashed border-gray-300">
              <div className="flex justify-between"><span>Order:</span> <span>#{completedOrder?.order_number}</span></div>
              <div className="flex justify-between"><span>Date:</span> <span>{new Date().toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Method:</span> <span className="capitalize">{paymentMethod}</span></div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-xs font-semibold uppercase border-b border-gray-200 pb-1">
                <span>Item</span>
                <span>Total</span>
              </div>
              {completedOrder?.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-sm border-t border-dashed border-gray-300 pt-4 mb-8">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{completedOrder?.subtotal.toFixed(2)}</span>
              </div>
              {completedOrder?.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span><span>-{completedOrder?.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>VAT ({taxRate}%)</span><span>{completedOrder?.tax.toFixed(2)}</span>
              </div>
              {completedOrder?.serviceCharge > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Service Charge</span><span>{completedOrder?.serviceCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-gray-200">
                <span>Total</span><span>NPR {completedOrder?.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground mb-4">
              <p>Thank you for dining with us!</p>
              <p>Please visit again.</p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:space-x-0 mt-4">
            <Button variant="outline" className="w-full" onClick={resetPOS}>
              Close & New Order
            </Button>
            <Button 
              className="w-full" 
              onClick={() => {
                const printContent = document.getElementById('printable-receipt');
                const originalContents = document.body.innerHTML;
                if (printContent) {
                  document.body.innerHTML = printContent.innerHTML;
                  window.print();
                  document.body.innerHTML = originalContents;
                  window.location.reload(); // Reload to restore React state bindings
                }
              }}
            >
              <Receipt className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
