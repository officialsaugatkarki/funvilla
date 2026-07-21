'use client'

import { useState } from 'react'
import { createPublicTrainingPackage } from '@/lib/actions/public.actions'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Waves, Phone, User } from 'lucide-react'

interface PoolPackageFormProps {
  packageName: string
  price: number
  trigger: React.ReactNode
}

export function PoolPackageForm({ packageName, price, trigger }: PoolPackageFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const visitorName = formData.get('name') as string
    const phone = formData.get('phone') as string

    try {
      const res = await createPublicTrainingPackage({ packageName, visitorName, phone })

      if (res.error) {
        setError(res.error)
        setLoading(false)
        return
      }

      // Open WhatsApp with pre-filled message
      const msg =
        `Hello! I'd like to register for *Swimming Training* at Khukuri Resort.\n\n` +
        `📦 *Package:* ${packageName} (NPR ${price.toLocaleString()})\n` +
        `👤 *Name:* ${visitorName}\n` +
        `📞 *Phone:* ${phone}\n\n` +
        `Please confirm my registration. Thank you!`
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
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl z-50 overflow-hidden focus:outline-none animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="bg-primary px-6 py-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-1">Swimming Training</p>
                <Dialog.Title className="text-xl font-serif text-white flex items-center gap-2">
                  <Waves className="h-5 w-5 text-accent" /> {packageName}
                </Dialog.Title>
              </div>
              <Dialog.Close className="h-8 w-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors mt-0.5">
                <X className="h-4 w-4 text-white" />
              </Dialog.Close>
            </div>
            <p className="text-white/70 text-xs mt-2">NPR {price.toLocaleString()} · For everyone · Khukuri Resort</p>
          </div>

          {/* Body */}
          <div className="p-6">
            {success ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-serif text-lg text-primary">Registration Received!</p>
                <p className="text-xs text-foreground/60 mt-1">WhatsApp opened for quick confirmation.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-red-600 text-xs bg-red-50 border border-red-100 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div>
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

                <div>
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
                    '✓ Register & Open WhatsApp'
                  )}
                </button>
                <p className="text-center text-[10px] text-foreground/40">
                  You'll be redirected to WhatsApp to complete your registration
                </p>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
