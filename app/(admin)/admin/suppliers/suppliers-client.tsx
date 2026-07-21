'use client'

import { useState } from 'react'
import { Truck, Plus, Mail, Phone, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { createSupplier } from '@/lib/actions/suppliers.actions'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function SuppliersClient({ initialSuppliers }: { initialSuppliers: any[] }) {
  const [suppliers, setSuppliers] = useState<any[]>(initialSuppliers)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name) {
      toast.error('Supplier name is required')
      return
    }

    setSubmitting(true)
    const { error } = await createSupplier({
      name,
      contactPerson: contactPerson || null,
      email: email || null,
      phone: phone || null,
      address: address || null
    })

    if (error) {
      toast.error(error)
    } else {
      toast.success('Supplier added')
      setIsCreateOpen(false)
      window.location.reload()
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" /> Suppliers
          </h1>
          <p className="text-muted-foreground">Manage vendors and suppliers for inventory.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No suppliers found.</TableCell></TableRow>
              ) : (
                suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contact_person || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {s.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-muted-foreground"/> {s.email}</div>}
                        {s.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground"/> {s.phone}</div>}
                        {!s.email && !s.phone && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.address ? (
                         <div className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3 text-muted-foreground"/> {s.address}</div>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add Supplier</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Company / Supplier Name *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Fresh Farms Ltd." />
              </div>
              <div className="grid gap-2">
                <Label>Contact Person</Label>
                <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="orders@freshfarms.com" />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+977..." />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Kathmandu, Nepal" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add Supplier'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
