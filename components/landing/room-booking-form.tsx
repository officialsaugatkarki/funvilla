'use client'

import { useState } from 'react'
import { createPublicRoomBooking } from '@/lib/actions/public.actions'
import * as Dialog from '@radix-ui/react-dialog'
import { X, BedDouble, Calendar, Phone, User, Users } from 'lucide-react'

interface RoomBookingFormProps {
  roomName: string
  roomTypeId: string
  price: number
  trigger: React.ReactNode
}

export function RoomBookingForm({ roomName, roomTypeId, price, trigger }: RoomBookingFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const guestName = formData.get('name') as string
    const guestPhone = formData.get('phone') as string
    const guestCount = parseInt(formData.get('guests') as string)
    const checkInDate = formData.get('checkIn') as string
    const checkOutDate = formData.get('checkOut') as string

    try {
      const res = await createPublicRoomBooking({
        roomName,
        roomTypeId,
        guestName,
        guestPhone,
        guestCount,
        checkInDate,
        checkOutDate,
      })

      if (res.error) {
        setError(res.error)
        setLoading(false)
        return
      }

      // Open WhatsApp with pre-filled message
      const msg =
        `Hello! I'd like to book the *${roomName}* at Khukuri Resort.\n\n` +
        `👤 *Name:* ${guestName}\n` +
        `📞 *Phone:* ${guestPhone}\n` +
        `👥 *Guests:* ${guestCount}\n` +
        `📅 *Check-in:* ${checkInDate}\n` +
        `📅 *Check-out:* ${checkOutDate}\n\n` +
        `Please confirm my booking. Thank you!`
      window.open(`https://wa.me/9779855073719?text=${encodeURIComponent(msg)}`, '_blank')

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); setError(''); setSuccess(false) }}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden focus:outline-none animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="bg-primary px-6 py-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-1">Khukuri Resort</p>
                <Dialog.Title className="text-xl font-serif text-white flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-accent" /> Book {roomName}
                </Dialog.Title>
              </div>
              <Dialog.Close className="h-8 w-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors mt-0.5">
                <X className="h-4 w-4 text-white" />
              </Dialog.Close>
            </div>
            <p className="text-white/70 text-xs mt-2">NPR {price.toLocaleString()} / night · Fill in your details to confirm</p>
          </div>

          {/* Body */}
          <div className="p-6">
            {success ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-serif text-lg text-primary">Booking Confirmed!</p>
                <p className="text-xs text-foreground/60 mt-1">WhatsApp opened for quick confirmation.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-red-600 text-xs bg-red-50 border border-red-100 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-foreground/60 mb-1.5 uppercase tracking-wider">
                      <User className="h-3 w-3 inline mr-1" />Full Name
                    </label>
                    <input
                      required
                      name="name"
                      placeholder="Your full name"
                      className="w-full h-10 border border-black/10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-foreground/60 mb-1.5 uppercase tracking-wider">
                      <Phone className="h-3 w-3 inline mr-1" />Phone Number
                    </label>
                    <input
                      required
                      name="phone"
                      placeholder="+977 98XXXXXXXX"
                      className="w-full h-10 border border-black/10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/60 mb-1.5 uppercase tracking-wider">
                      <Calendar className="h-3 w-3 inline mr-1" />Check-in
                    </label>
                    <input
                      required
                      type="date"
                      name="checkIn"
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full h-10 border border-black/10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/60 mb-1.5 uppercase tracking-wider">
                      <Calendar className="h-3 w-3 inline mr-1" />Check-out
                    </label>
                    <input
                      required
                      type="date"
                      name="checkOut"
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full h-10 border border-black/10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-foreground/60 mb-1.5 uppercase tracking-wider">
                      <Users className="h-3 w-3 inline mr-1" />Number of Guests
                    </label>
                    <select
                      name="guests"
                      defaultValue="1"
                      className="w-full h-10 border border-black/10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
                    >
                      {[1,2,3,4].map(n => (
                        <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full h-12 bg-primary text-white rounded-full font-semibold uppercase tracking-wider text-xs hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    '✓ Confirm & Open WhatsApp'
                  )}
                </button>
                <p className="text-center text-[10px] text-foreground/40">
                  You'll be redirected to WhatsApp to complete your booking
                </p>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
