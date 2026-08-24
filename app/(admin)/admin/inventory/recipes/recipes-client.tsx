'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Search, Utensils, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { addRecipeIngredient, removeRecipeIngredient } from '@/lib/actions/inventory.actions'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function RecipesClient({
  menuItems,
  inventoryItems,
  recipes
}: {
  menuItems: any[]
  inventoryItems: any[]
  recipes: any[]
}) {
  const [selectedMenuItem, setSelectedMenuItem] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  // Form state
  const [selectedInventoryId, setSelectedInventoryId] = useState('')
  const [quantity, setQuantity] = useState('')

  const filteredMenuItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const currentRecipes = recipes.filter(r => r.menu_item_id === selectedMenuItem?.id)
  
  // Calculate total cost
  const totalCost = currentRecipes.reduce((sum, r) => {
    return sum + (r.quantity * (r.inventory?.cost_per_unit || 0))
  }, 0)

  async function handleAddIngredient(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMenuItem || !selectedInventoryId || !quantity) return

    const invItem = inventoryItems.find(i => i.id === selectedInventoryId)
    if (!invItem) return

    startTransition(async () => {
      const result = await addRecipeIngredient({
        menuItemId: selectedMenuItem.id,
        inventoryId: selectedInventoryId,
        quantity: parseFloat(quantity),
        unit: invItem.unit
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Ingredient added')
        setSelectedInventoryId('')
        setQuantity('')
      }
    })
  }

  async function handleRemoveIngredient(id: string) {
    startTransition(async () => {
      const result = await removeRecipeIngredient(id)
      if (result.error) toast.error(result.error)
      else toast.success('Ingredient removed')
    })
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-14rem)]">
      {/* Left Panel: Menu Items */}
      <Card className="w-full md:w-1/3 flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle>Menu Items</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search menu..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 bg-muted/50" 
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="divide-y">
              {filteredMenuItems.map(item => {
                const itemRecipeCount = recipes.filter(r => r.menu_item_id === item.id).length
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMenuItem(item)}
                    className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center justify-between ${selectedMenuItem?.id === item.id ? 'bg-muted/50 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">NPR {item.price}</p>
                    </div>
                    {itemRecipeCount > 0 && (
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {itemRecipeCount} items
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel: Recipe Details */}
      <Card className="w-full md:w-2/3 flex flex-col h-full bg-muted/10">
        {!selectedMenuItem ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Utensils className="h-16 w-16 mb-4 opacity-20" />
            <h3 className="text-xl font-medium">Select a Menu Item</h3>
            <p className="text-sm">Choose an item to manage its recipe and stock deductions.</p>
          </div>
        ) : (
          <>
            <CardHeader className="border-b bg-background">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedMenuItem.name}</CardTitle>
                  <CardDescription>Configure ingredients to auto-deduct when this is ordered.</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Est. Cost</p>
                  <p className="text-xl font-bold text-destructive">NPR {totalCost.toFixed(2)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-auto">
              {/* Add form */}
              <form onSubmit={handleAddIngredient} className="flex items-end gap-3 p-4 bg-background border rounded-lg shadow-sm mb-6">
                <div className="flex-1 space-y-1.5">
                  <Label>Inventory Item</Label>
                  <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
                    <SelectTrigger><SelectValue placeholder="Select ingredient..." /></SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.name} (per {inv.unit}) - NPR {inv.cost_per_unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-1.5">
                  <Label>Quantity</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      value={quantity} 
                      onChange={e => setQuantity(e.target.value)} 
                      placeholder="0.00"
                      required
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-xs text-muted-foreground">
                      {selectedInventoryId ? inventoryItems.find(i => i.id === selectedInventoryId)?.unit : ''}
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={isPending || !selectedInventoryId || !quantity}>
                  <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
              </form>

              {/* Recipe Table */}
              <div className="rounded-lg border bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Ingredient</th>
                      <th className="text-left p-3 font-medium">Deduction Qty</th>
                      <th className="text-left p-3 font-medium">Est. Cost</th>
                      <th className="text-right p-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentRecipes.length === 0 ? (
                      <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">No ingredients mapped yet.</td></tr>
                    ) : currentRecipes.map(recipe => {
                      const cost = recipe.quantity * (recipe.inventory?.cost_per_unit || 0)
                      return (
                        <tr key={recipe.id} className="hover:bg-muted/30">
                          <td className="p-3 font-medium">{recipe.inventory?.name}</td>
                          <td className="p-3">{recipe.quantity} {recipe.unit}</td>
                          <td className="p-3 text-muted-foreground">NPR {cost.toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveIngredient(recipe.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>When an order containing <strong>{selectedMenuItem.name}</strong> is completed, the quantities listed above will be automatically deducted from your inventory.</p>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
