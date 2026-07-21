'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Waves, Plus, Search, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { createPoolTicket } from '@/lib/actions/bookings.actions'
import { format } from 'date-fns'

export default function PoolClient({ tickets }: { tickets: any[] }) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = tickets.filter(t => !search || t.visitor_name?.toLowerCase().includes(search.toLowerCase()) || t.ticket_type.includes(search))

  async function handleCreateTicket(fd: FormData) {
    const payload = {
      ticketType: fd.get('ticket_type') as string,
      visitorName: fd.get('visitor_name') as string,
      visitorCount: parseInt(fd.get('visitor_count') as string) || 1,
      paymentMethod: fd.get('payment_method') as string,
    }
    startTransition(async () => {
      const result = await createPoolTicket(payload)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Ticket issued successfully')
        setIsOpen(false)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Waves className="h-8 w-8 text-blue-500" /> Pool Management
          </h1>
          <p className="text-muted-foreground">
            {tickets.filter(t => t.valid_date === new Date().toISOString().split('T')[0]).length} tickets issued today
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Issue Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Issue New Pool Ticket</DialogTitle></DialogHeader>
            <form action={handleCreateTicket} className="space-y-4">
              <div>
                <Label>Ticket Type</Label>
                <Select name="ticket_type" defaultValue="adult">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adult">Adult</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="family">Family Package</SelectItem>
                    <SelectItem value="member">Club Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Visitor Name (Optional)</Label><Input name="visitor_name" /></div>
              <div><Label>Number of Visitors</Label><Input name="visitor_count" type="number" defaultValue="1" min="1" required /></div>
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
                {isPending ? 'Processing...' : 'Issue Ticket & Print'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-4 font-medium">Ticket ID</th>
              <th className="text-left p-4 font-medium">Visitor</th>
              <th className="text-left p-4 font-medium">Type</th>
              <th className="text-left p-4 font-medium">Count</th>
              <th className="text-left p-4 font-medium">Amount</th>
              <th className="text-left p-4 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No tickets found.</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="hover:bg-muted/20">
                <td className="p-4 font-mono text-xs">{t.id.split('-')[0]}</td>
                <td className="p-4 font-medium">{t.visitor_name || 'Walk-in Guest'}</td>
                <td className="p-4"><Badge variant={t.ticket_type === 'member' && t.notes ? 'default' : 'outline'} className="capitalize">{t.notes || t.ticket_type.replace('_', ' ')}</Badge></td>
                <td className="p-4">
                  <div className="flex items-center gap-1"><Ticket className="h-3 w-3 text-muted-foreground"/> {t.visitor_count}</div>
                </td>
                <td className="p-4 font-medium text-primary">NPR {t.price}</td>
                <td className="p-4 text-muted-foreground">{format(new Date(t.check_in_time), 'PPp')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
