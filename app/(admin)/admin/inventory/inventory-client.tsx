'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Package, Plus, AlertTriangle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { createInventoryItem, adjustInventory } from '@/lib/actions/inventory.actions'
import { cn } from '@/lib/utils'

export default function InventoryClient({ inventory, lowStock }: { inventory: any[], lowStock: any[] }) {
  const [search, setSearch] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [adjItem, setAdjItem] = useState<any>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = inventory.filter(i => 
    !search || 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.sku && i.sku.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleAdd(fd: FormData) {
    const payload = {
      name: fd.get('name') as string,
      sku: (fd.get('sku') as string) || undefined,
      category: (fd.get('category') as string) || undefined,
      unit: fd.get('unit') as string,
      quantity: parseFloat(fd.get('quantity') as string),
      min_quantity: parseFloat(fd.get('min_quantity') as string),
      cost_per_unit: parseFloat(fd.get('cost_per_unit') as string),
    }
    startTransition(async () => {
      const res = await createInventoryItem(payload)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Inventory item added successfully')
        setIsAddOpen(false)
      }
    })
  }

  async function handleAdjust(fd: FormData) {
    const payload = {
      inventoryId: adjItem.id,
      type: fd.get('type') as any,
      quantity: parseFloat(fd.get('quantity') as string),
      notes: (fd.get('notes') as string) || undefined,
    }
    startTransition(async () => {
      const res = await adjustInventory(payload)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Inventory adjusted successfully')
        setAdjItem(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" /> Inventory
          </h1>
          <p className="text-muted-foreground">{inventory.length} total items trackable</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Add New Inventory Item</DialogTitle></DialogHeader>
            <form action={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input name="name" required /></div>
                <div><Label>SKU</Label><Input name="sku" /></div>
                <div><Label>Category</Label><Input name="category" /></div>
                <div><Label>Unit of Measure *</Label><Input name="unit" placeholder="kg, L, box, pcs" required /></div>
                <div><Label>Initial Quantity *</Label><Input name="quantity" type="number" step="0.01" required /></div>
                <div><Label>Min. Alert Quantity *</Label><Input name="min_quantity" type="number" step="0.01" required /></div>
                <div><Label>Cost per Unit (NPR) *</Label><Input name="cost_per_unit" type="number" step="0.01" required /></div>
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Item'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-4">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
          <div>
            <h3 className="font-semibold text-destructive">Low Stock Alerts</h3>
            <p className="text-sm text-destructive/80 mb-2">The following items are at or below their minimum quantity:</p>
            <div className="flex gap-2 flex-wrap">
              {lowStock.map(i => (
                <Badge key={i.id} variant="outline" className="bg-white border-destructive text-destructive">
                  {i.name} ({i.quantity} {i.unit})
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search items or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-medium whitespace-nowrap">Item Name</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Category</th>
                <th className="text-right p-4 font-medium whitespace-nowrap">Stock Level</th>
                <th className="text-left p-4 font-medium hidden lg:table-cell">Value</th>
                <th className="text-right p-4 font-medium whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No items found.</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="font-medium flex items-center gap-2">
                      {item.name}
                      {item.is_out_of_stock ? (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px] bg-red-600">Out</Badge>
                      ) : item.is_low_stock ? (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Low</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku || 'No SKU'}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell text-muted-foreground">{item.category || '—'}</td>
                  <td className="p-4 text-right">
                    <span className={cn('font-bold', item.quantity <= item.min_quantity ? 'text-destructive' : 'text-emerald-600')}>
                      {item.quantity} <span className="text-xs font-normal text-muted-foreground ml-0.5">{item.unit}</span>
                    </span>
                  </td>
                  <td className="p-4 hidden lg:table-cell text-muted-foreground">
                    NPR {(item.quantity * item.cost_per_unit).toFixed(2)}
                  </td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="outline" onClick={() => setAdjItem(item)}>
                      Adjust
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!adjItem} onOpenChange={(o) => !o && setAdjItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock: {adjItem?.name}</DialogTitle></DialogHeader>
          <form action={handleAdjust} className="space-y-4 pt-2">
            <div className="bg-muted p-3 rounded-lg text-sm flex justify-between border">
              <span className="text-muted-foreground">Current Quantity:</span>
              <span className="font-bold">{adjItem?.quantity} {adjItem?.unit}</span>
            </div>
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select name="type" defaultValue="purchase">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Restock (Purchase)</SelectItem>
                  <SelectItem value="consumption">Usage / Consumption</SelectItem>
                  <SelectItem value="waste">Waste / Spoilage</SelectItem>
                  <SelectItem value="adjustment">Manual Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity ({adjItem?.unit})</Label>
              <Input name="quantity" type="number" step="0.01" required placeholder="Enter amount to adjust" />
              <p className="text-[10px] text-muted-foreground">For consumption/waste, enter a positive number. It will be subtracted automatically.</p>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input name="notes" placeholder="Invoice #, reason, etc." />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Processing...' : 'Submit Adjustment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
