'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Droplets, Plus, Minus, Search, Ticket, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createSwimmingTicket } from '@/lib/actions/bookings.actions'
import { printSwimmingTicket } from '@/lib/printing/print-bridge'
import { format } from 'date-fns'

const ADULT_PRICE = 200
const CHILD_PRICE = 150

export default function SwimmingClient({ tickets }: { tickets: any[] }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isPrinting, setIsPrinting] = useState<string | null>(null)

  // Visitor counts
  const [adultCount, setAdultCount] = useState(1)
  const [childCount, setChildCount] = useState(0)

  // Visitor info
  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [visitorAddress, setVisitorAddress] = useState('')
  const [visitorGender, setVisitorGender] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  const totalPrice = (adultCount * ADULT_PRICE) + (childCount * CHILD_PRICE)
  const totalVisitors = adultCount + childCount

  const filtered = tickets.filter(t =>
    !search ||
    t.visitor_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.visitor_phone?.toLowerCase().includes(search.toLowerCase()) ||
    t.visitor_address?.toLowerCase().includes(search.toLowerCase()) ||
    (t.notes || t.ticket_type).toLowerCase().includes(search.toLowerCase())
  )

  function resetForm() {
    setAdultCount(1)
    setChildCount(0)
    setVisitorName('')
    setVisitorPhone('')
    setVisitorAddress('')
    setVisitorGender('')
    setPaymentMethod('cash')
  }

  async function handleCreateTicket() {
    if (totalVisitors < 1) {
      toast.error('Add at least 1 visitor')
      return
    }

    startTransition(async () => {
      const result = await createSwimmingTicket({
        adultCount,
        childCount,
        visitorName: visitorName || undefined,
        visitorPhone: visitorPhone || undefined,
        visitorAddress: visitorAddress || undefined,
        visitorGender: visitorGender || undefined,
        paymentMethod,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Ticket issued successfully')
        setIsOpen(false)
        resetForm()
        if (result.data) {
          await printSwimmingTicket(result.data)
        }
      }
    })
  }

  async function handleReprint(ticket: any) {
    setIsPrinting(ticket.id)
    try {
      await printSwimmingTicket(ticket)
    } finally {
      setIsPrinting(null)
    }
  }

  function CounterRow({
    label,
    price,
    count,
    onDec,
    onInc,
    color,
  }: {
    label: string
    price: number
    count: number
    onDec: () => void
    onInc: () => void
    color: string
  }) {
    return (
      <div className="flex items-center justify-between py-3 border rounded-xl px-4 bg-muted/30">
        <div>
          <p className="font-semibold text-sm">{label}</p>
          <p className={`text-xs font-medium ${color}`}>Rs {price} per person</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDec}
            disabled={count <= 0}
            className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-all"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-lg font-bold w-6 text-center">{count}</span>
          <button
            type="button"
            onClick={onInc}
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-all"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <p className="w-16 text-right font-bold text-sm">
          {count > 0 ? `Rs ${count * price}` : '—'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Droplets className="h-8 w-8 text-blue-500" /> Swimming Tickets
          </h1>
          <p className="text-muted-foreground">
            {tickets.filter(t => t.valid_date === new Date().toISOString().split('T')[0]).length} tickets issued today
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Issue Ticket</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Issue New Swimming Ticket</DialogTitle></DialogHeader>
            <div className="space-y-4">

              {/* Visitors */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Visitors</Label>
                <CounterRow
                  label="Adult"
                  price={ADULT_PRICE}
                  count={adultCount}
                  onDec={() => setAdultCount(Math.max(0, adultCount - 1))}
                  onInc={() => setAdultCount(adultCount + 1)}
                  color="text-blue-600"
                />
                <CounterRow
                  label="Child"
                  price={CHILD_PRICE}
                  count={childCount}
                  onDec={() => setChildCount(Math.max(0, childCount - 1))}
                  onInc={() => setChildCount(childCount + 1)}
                  color="text-green-600"
                />
              </div>

              {/* Live price summary */}
              {totalVisitors > 0 && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 space-y-1">
                  {adultCount > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{adultCount} Adult{adultCount > 1 ? 's' : ''} × Rs {ADULT_PRICE}</span>
                      <span>Rs {adultCount * ADULT_PRICE}</span>
                    </div>
                  )}
                  {childCount > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{childCount} Child{childCount > 1 ? 'ren' : ''} × Rs {CHILD_PRICE}</span>
                      <span>Rs {childCount * CHILD_PRICE}</span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold text-primary">
                    <span>Total ({totalVisitors} {totalVisitors === 1 ? 'person' : 'people'})</span>
                    <span>Rs {totalPrice}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Visitor info */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Visitor Details</Label>
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input value={visitorName} onChange={e => setVisitorName(e.target.value)} placeholder="Full name" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <Input value={visitorPhone} onChange={e => setVisitorPhone(e.target.value)} type="tel" placeholder="e.g. 9800000000" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <Input value={visitorAddress} onChange={e => setVisitorAddress(e.target.value)} placeholder="City / Village" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <Select value={visitorGender} onValueChange={setVisitorGender}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="esewa">eSewa</SelectItem>
                      <SelectItem value="room_charge">Room Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleCreateTicket}
                disabled={isPending || totalVisitors < 1}
              >
                <Printer className="mr-2 h-4 w-4" />
                {isPending ? 'Processing...' : `Issue & Print — Rs ${totalPrice}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-4 font-medium">Ticket No</th>
              <th className="text-left p-4 font-medium">Visitor</th>
              <th className="text-left p-4 font-medium">Phone</th>
              <th className="text-left p-4 font-medium">Address</th>
              <th className="text-left p-4 font-medium">Gender</th>
              <th className="text-left p-4 font-medium">Breakdown</th>
              <th className="text-left p-4 font-medium">People</th>
              <th className="text-left p-4 font-medium">Amount</th>
              <th className="text-left p-4 font-medium">Time</th>
              <th className="text-left p-4 font-medium">Print</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center p-8 text-muted-foreground">No tickets found.</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="hover:bg-muted/20">
                <td className="p-4 font-mono text-xs">{t.ticket_number || t.id.split('-')[0]}</td>
                <td className="p-4 font-medium">{t.visitor_name || <span className="text-muted-foreground">Walk-in</span>}</td>
                <td className="p-4 text-muted-foreground">{t.visitor_phone || '—'}</td>
                <td className="p-4 text-muted-foreground">{t.visitor_address || '—'}</td>
                <td className="p-4 capitalize text-muted-foreground">{t.visitor_gender || '—'}</td>
                <td className="p-4">
                  <Badge variant="outline" className="capitalize whitespace-nowrap">
                    {t.notes || t.ticket_type}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1"><Ticket className="h-3 w-3 text-muted-foreground"/> {t.visitor_count}</div>
                </td>
                <td className="p-4 font-medium text-primary">NPR {t.price}</td>
                <td className="p-4 text-muted-foreground">{format(new Date(t.check_in_time), 'PPp')}</td>
                <td className="p-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReprint(t)}
                    disabled={isPrinting === t.id}
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    {isPrinting === t.id ? '...' : 'Print'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

