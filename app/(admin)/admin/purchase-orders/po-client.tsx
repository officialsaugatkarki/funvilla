'use client'

import { useState } from 'react'
import { FileText, Plus, Eye, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { createPurchaseOrder } from '@/lib/actions/purchase-orders.actions'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export default function POClient({ initialPOs, suppliers, inventory }: { initialPOs: any[], suppliers: any[], inventory: any[] }) {
  const [pos, setPOs] = useState<any[]>(initialPOs)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form
  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<{inventoryId: string, quantity: number, unitPrice: number}[]>([])

  function addItem() {
    setItems([...items, { inventoryId: '', quantity: 1, unitPrice: 0 }])
  }

  function updateItem(index: number, field: string, value: any) {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId || items.length === 0 || items.some(i => !i.inventoryId)) {
      toast.error('Please select supplier and at least one valid item')
      return
    }

    setSubmitting(true)
    const { error } = await createPurchaseOrder({
      supplierId,
      expectedDate: expectedDate || null,
      notes: notes || null,
      items
    })

    if (error) {
      toast.error(error)
    } else {
      toast.success('Purchase Order created')
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
            <FileText className="h-8 w-8 text-primary" /> Purchase Orders
          </h1>
          <p className="text-muted-foreground">Manage and track inventory orders from suppliers.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create PO
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchase orders found.</TableCell></TableRow>
              ) : (
                pos.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.suppliers?.name}</TableCell>
                    <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>Rs. {po.total_amount?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={po.status === 'received' ? 'default' : 'secondary'} className="capitalize">
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedPO(po)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PO Details Modal */}
      <Dialog open={!!selectedPO} onOpenChange={(open) => !open && setSelectedPO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>PO Details: {selectedPO?.po_number}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Supplier</p>
                    <p className="font-medium">{selectedPO.suppliers?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={selectedPO.status === 'received' ? 'default' : 'secondary'} className="capitalize mt-1">
                      {selectedPO.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expected Date</p>
                    <p className="font-medium">{selectedPO.expected_date ? new Date(selectedPO.expected_date).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Amount</p>
                    <p className="font-medium">Rs. {selectedPO.total_amount?.toLocaleString()}</p>
                  </div>
               </div>
               
               <div className="border rounded-md mt-4">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Item</TableHead>
                       <TableHead>Qty</TableHead>
                       <TableHead>Unit Price</TableHead>
                       <TableHead>Total</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {selectedPO.purchase_order_items?.map((item: any) => (
                       <TableRow key={item.id}>
                         <TableCell>{item.inventory?.name}</TableCell>
                         <TableCell>{item.quantity} {item.inventory?.unit}</TableCell>
                         <TableCell>Rs. {item.unit_price}</TableCell>
                         <TableCell>Rs. {item.total_price}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>
               <div className="flex justify-end pt-4">
                 <Button variant="outline" onClick={() => setSelectedPO(null)}>Close</Button>
               </div>
             </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create PO Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Supplier</Label>
                  <Select value={supplierId} onValueChange={setSupplierId} required>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Expected Delivery Date (Optional)</Label>
                  <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>Add Item</Button>
                </div>
                {items.length === 0 ? (
                  <div className="text-center p-4 border rounded-md text-muted-foreground bg-muted/20 text-sm">
                    No items added yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 border p-2 rounded-md bg-muted/20">
                        <div className="flex-1">
                          <Select value={item.inventoryId} onValueChange={v => updateItem(idx, 'inventoryId', v)}>
                            <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                            <SelectContent>
                              {inventory.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Input type="number" step="0.01" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value))} />
                        </div>
                        <div className="w-32">
                          <Input type="number" step="0.01" placeholder="Unit Price" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value))} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeItem(idx)}>
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Delivery instructions etc." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || items.length === 0}>{submitting ? 'Creating...' : 'Create PO'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
