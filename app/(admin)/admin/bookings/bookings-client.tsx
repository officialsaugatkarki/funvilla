'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Search, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { updateBookingStatus } from '@/lib/actions/bookings.actions'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-emerald-100 text-emerald-800',
  checked_out: 'bg-slate-100 text-slate-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
}

export default function BookingsClient({ bookings, rooms }: { bookings: any[], rooms: any[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [newStatus, setNewStatus] = useState('')
  const [assignRoom, setAssignRoom] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = bookings.filter(b => {
    const matchSearch = !search || b.guest_name.toLowerCase().includes(search.toLowerCase()) || (b.guest_phone && b.guest_phone.includes(search))
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleUpdateStatus() {
    if (!selected || !newStatus) return
    startTransition(async () => {
      const result = await updateBookingStatus(selected.id, newStatus, assignRoom || undefined)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Booking updated')
        setSelected(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Room Bookings</h1>
        <p className="text-muted-foreground">
          {bookings.filter(b => b.status === 'confirmed').length} confirmed · {bookings.filter(b => b.status === 'checked_in').length} checked in
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by guest name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-4 font-medium">Guest</th>
              <th className="text-left p-4 font-medium hidden md:table-cell">Room Type</th>
              <th className="text-left p-4 font-medium">Dates</th>
              <th className="text-left p-4 font-medium hidden md:table-cell">Total</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No bookings found.</td></tr>
            ) : filtered.map(booking => (
              <tr key={booking.id} className="hover:bg-muted/20 transition-colors">
                <td className="p-4">
                  <p className="font-medium text-foreground">{booking.guest_name}</p>
                  <p className="text-xs text-muted-foreground">{booking.guest_phone}</p>
                </td>
                <td className="p-4 hidden md:table-cell text-muted-foreground">
                  {booking.room_types?.name ?? '—'}
                  {booking.rooms?.room_number && (
                    <span className="ml-2 text-xs border px-1.5 py-0.5 rounded-md">Room {booking.rooms.room_number}</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-col text-xs space-y-1">
                    <span className="flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-3 w-3" /> In: {format(new Date(booking.check_in_date), 'MMM dd')}</span>
                    <span className="flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-3 w-3" /> Out: {format(new Date(booking.check_out_date), 'MMM dd')}</span>
                  </div>
                </td>
                <td className="p-4 hidden md:table-cell font-medium">
                  NPR {booking.total}
                </td>
                <td className="p-4">
                  <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider', STATUS_COLORS[booking.status] || 'bg-muted text-muted-foreground')}>
                    {booking.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <Button size="sm" variant="outline" onClick={() => { setSelected(booking); setNewStatus(booking.status); setAssignRoom(booking.room_id || '') }}>
                    <Eye className="h-4 w-4 mr-2" /> View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Booking #{selected?.booking_number}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border">
                <div><Label className="text-muted-foreground text-xs">Guest Name</Label><p className="font-medium">{selected.guest_name}</p></div>
                <div><Label className="text-muted-foreground text-xs">Phone / Email</Label><p className="font-medium">{selected.guest_phone}<br/><span className="text-muted-foreground">{selected.guest_email}</span></p></div>
                <div><Label className="text-muted-foreground text-xs">Check In</Label><p className="font-medium">{format(new Date(selected.check_in_date), 'MMM dd, yyyy')}</p></div>
                <div><Label className="text-muted-foreground text-xs">Check Out</Label><p className="font-medium">{format(new Date(selected.check_out_date), 'MMM dd, yyyy')}</p></div>
                <div><Label className="text-muted-foreground text-xs">Guests</Label><p className="font-medium">{selected.guest_count} persons</p></div>
                <div><Label className="text-muted-foreground text-xs">Nights</Label><p className="font-medium">{selected.nights}</p></div>
                <div><Label className="text-muted-foreground text-xs">Total Amount</Label><p className="font-bold text-lg text-primary">NPR {selected.total}</p></div>
                <div><Label className="text-muted-foreground text-xs">Payment Status</Label><p className="font-medium capitalize">{selected.payment_status}</p></div>
                {selected.special_requests && (
                  <div className="col-span-2 mt-2 pt-2 border-t">
                    <Label className="text-muted-foreground text-xs">Special Requests</Label>
                    <p className="italic text-muted-foreground bg-muted p-2 rounded-md mt-1">{selected.special_requests}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Update Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="checked_in">Check In</SelectItem>
                      <SelectItem value="checked_out">Check Out</SelectItem>
                      <SelectItem value="cancelled">Cancel</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(newStatus === 'checked_in' || newStatus === 'confirmed') && (
                  <div className="space-y-2">
                    <Label>Assign Room</Label>
                    <Select value={assignRoom} onValueChange={setAssignRoom}>
                      <SelectTrigger><SelectValue placeholder="Assign a room" /></SelectTrigger>
                      <SelectContent>
                        {rooms.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>
                            Room {r.room_number} — {(r.room_types as any)?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button className="w-full" onClick={handleUpdateStatus} disabled={isPending}>
                  {isPending ? 'Updating...' : 'Update Booking'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
