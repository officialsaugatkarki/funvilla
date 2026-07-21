'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Users, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updateRoomStatus } from '@/lib/actions/bookings.actions'
import { createRoom, createRoomType } from '@/lib/actions/rooms.actions'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  available:   { bg: 'bg-emerald-50', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  occupied:    { bg: 'bg-red-50', border: 'border-red-300', dot: 'bg-red-500' },
  reserved:    { bg: 'bg-amber-50', border: 'border-amber-300', dot: 'bg-amber-500' },
  cleaning:    { bg: 'bg-sky-50', border: 'border-sky-300', dot: 'bg-sky-500' },
  maintenance: { bg: 'bg-purple-50', border: 'border-purple-300', dot: 'bg-purple-500' },
  out_of_order: { bg: 'bg-muted/50', border: 'border-border', dot: 'bg-muted-foreground' },
}

export default function RoomsClient({ rooms, roomTypes }: { rooms: any[], roomTypes: any[] }) {
  const [filter, setFilter] = useState('all')
  const [isTypeOpen, setIsTypeOpen] = useState(false)
  const [isRoomOpen, setIsRoomOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleCreateType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const { error } = await createRoomType({
        name: fd.get('name') as string,
        basePrice: parseFloat(fd.get('price') as string),
        maxOccupancy: parseInt(fd.get('occupancy') as string),
        amenities: []
      })
      if (error) toast.error(error)
      else {
        toast.success('Room type created')
        setIsTypeOpen(false)
      }
    })
  }

  async function handleCreateRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const { error } = await createRoom({
        roomTypeId: fd.get('typeId') as string,
        roomNumber: fd.get('roomNumber') as string,
        floor: fd.get('floor') as string
      })
      if (error) toast.error(error)
      else {
        toast.success('Room created')
        setIsRoomOpen(false)
      }
    })
  }

  const counts = {
    all: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
  }

  const filtered = rooms.filter(r => filter === 'all' || r.status === filter)

  async function handleStatusChange(roomId: string, status: string, housekeepingStatus?: string) {
    startTransition(async () => {
      const result = await updateRoomStatus(roomId, status, housekeepingStatus)
      if (result.error) toast.error(result.error)
      else toast.success('Room status updated')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Room Management</h1>
          <p className="text-muted-foreground">
            {counts.occupied} occupied · {counts.available} available · {counts.cleaning} cleaning
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isTypeOpen} onOpenChange={setIsTypeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Room Type</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateType}>
                <DialogHeader><DialogTitle>Add Room Type</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2"><Label>Name</Label><Input name="name" required placeholder="Deluxe Suite" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Base Price (NPR)</Label><Input name="price" type="number" required /></div>
                    <div className="grid gap-2"><Label>Max Occupancy</Label><Input name="occupancy" type="number" required /></div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsTypeOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isPending}>Create Type</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isRoomOpen} onOpenChange={setIsRoomOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Room</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateRoom}>
                <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Room Type</Label>
                    <Select name="typeId" required>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Room Number</Label><Input name="roomNumber" required /></div>
                    <div className="grid gap-2"><Label>Floor</Label><Input name="floor" /></div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsRoomOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isPending}>Create Room</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(Object.entries(counts) as [string, number][]).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize',
              filter === status
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-foreground'
            )}
          >
            {status} ({count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(room => {
          const style = STATUS_STYLES[room.status] || STATUS_STYLES.available
          const roomType = room.room_types as any
          return (
            <div key={room.id} className={cn('border-2 rounded-xl p-4', style.bg, style.border)}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', style.dot)} />
                  <p className="font-bold text-lg leading-none">Room {room.room_number}</p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">{room.status}</Badge>
              </div>

              <p className="text-sm font-medium text-muted-foreground mb-1">{roomType?.name ?? 'Standard Room'}</p>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {roomType?.max_occupancy ?? 2} guests
                </span>
                {room.floor && <span>Floor {room.floor}</span>}
              </div>

              {roomType?.base_price && (
                <p className="text-sm font-semibold mb-3">NPR {roomType.base_price}/night</p>
              )}

              <div className="space-y-1.5">
                <Select
                  value={room.status}
                  onValueChange={val => handleStatusChange(room.id, val)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 text-xs bg-white/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="out_of_order">Out of Order</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={room.housekeeping_status}
                  onValueChange={val => handleStatusChange(room.id, room.status, val)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 text-xs bg-white/70">
                    <SelectValue placeholder="Housekeeping status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clean">✓ Clean</SelectItem>
                    <SelectItem value="dirty">✗ Dirty</SelectItem>
                    <SelectItem value="inspected">✓✓ Inspected</SelectItem>
                    <SelectItem value="out_of_order">⊘ Out of Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
