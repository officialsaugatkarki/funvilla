'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Droplets, Plus, Search, Ticket, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { createSwimmingTicket } from '@/lib/actions/bookings.actions'
import { printSwimmingTicket } from '@/lib/printing/print-bridge'
import { format } from 'date-fns'

export default function SwimmingClient({ tickets }: { tickets: any[] }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isPrinting, setIsPrinting] = useState<string | null>(null)

  const filtered = tickets.filter(t =>
    !search ||
    t.visitor_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.visitor_phone?.toLowerCase().includes(search.toLowerCase()) ||
    t.visitor_address?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_type.includes(search)
  )

  async function handleCreateTicket(fd: FormData) {
    const payload = {
      ticketType:     fd.get('ticket_type') as string,
      visitorName:    (fd.get('visitor_name') as string) || undefined,
      visitorPhone:   (fd.get('visitor_phone') as string) || undefined,
      visitorAddress: (fd.get('visitor_address') as string) || undefined,
      visitorGender:  (fd.get('visitor_gender') as string) || undefined,
      visitorCount:   parseInt(fd.get('visitor_count') as string) || 1,
      paymentMethod:  fd.get('payment_method') as string,
    }

    startTransition(async () => {
      const result = await createSwimmingTicket(payload)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Ticket issued successfully')
        setIsOpen(false)
        // Auto-print the ticket
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

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Issue Ticket</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Issue New Swimming Ticket</DialogTitle></DialogHeader>
            <form action={handleCreateTicket} className="space-y-4">

              {/* Ticket Type */}
              <div>
                <Label>Ticket Type</Label>
                <Select name="ticket_type" defaultValue="adult">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adult">Adult (Rs 200)</SelectItem>
                    <SelectItem value="child">Child (Rs 150)</SelectItem>
                    <SelectItem value="family">Family Package</SelectItem>
                    <SelectItem value="member">Club Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Number of visitors */}
              <div>
                <Label>Number of Visitors</Label>
                <Input name="visitor_count" type="number" defaultValue="1" min="1" required />
              </div>

              {/* Visitor Name */}
              <div>
                <Label>Visitor Name</Label>
                <Input name="visitor_name" placeholder="Full name" />
              </div>

              {/* Phone */}
              <div>
                <Label>Phone Number</Label>
                <Input name="visitor_phone" type="tel" placeholder="e.g. 9800000000" />
              </div>

              {/* Address */}
              <div>
                <Label>Address</Label>
                <Input name="visitor_address" placeholder="City / Village" />
              </div>

              {/* Gender */}
              <div>
                <Label>Gender</Label>
                <Select name="visitor_gender" defaultValue="">
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div>
                <Label>Payment Method</Label>
                <Select name="payment_method" defaultValue="cash">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="esewa">eSewa</SelectItem>
                    <SelectItem value="room_charge">Room Charge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                <Printer className="mr-2 h-4 w-4" />
                {isPending ? 'Processing...' : 'Issue & Print Ticket'}
              </Button>
            </form>
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
              <th className="text-left p-4 font-medium">Type</th>
              <th className="text-left p-4 font-medium">Count</th>
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
                  <Badge variant="outline" className="capitalize">
                    {t.notes || t.ticket_type.replace('_', ' ')}
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
