'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createMenuItem, updateMenuItem, deleteMenuItem,
  toggleMenuItemAvailability, createMenuCategory, deleteMenuCategory
} from '@/lib/actions/menu.actions'
import Image from 'next/image'

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function MenuManagementClient({
  categories, items,
}: {
  categories: any[]
  items: any[]
}) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === 'all' || item.category_id === selectedCategory
    return matchSearch && matchCat
  })

  async function handleDeleteItem(id: string) {
    startTransition(async () => {
      const result = await deleteMenuItem(id)
      if (result.error) toast.error(result.error)
      else toast.success('Item deleted')
    })
  }

  async function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const result = await toggleMenuItemAvailability(id, !current)
      if (result.error) toast.error(result.error)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">Manage your categories and menu items.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCatDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Category
          </Button>
          <Button onClick={() => { setEditingItem(null); setIsItemDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-center p-3 font-medium">Available</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No items found.</td></tr>
                ) : filtered.map(item => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0">
                            <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <ChefHat className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.is_featured && <Badge variant="secondary" className="text-[10px]">Featured</Badge>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {(item.menu_categories as any)?.name ?? '—'}
                    </td>
                    <td className="p-3 font-medium">NPR {item.price}</td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={() => handleToggle(item.id, item.is_available)}
                        disabled={isPending}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8"
                          onClick={() => { setEditingItem(item); setIsItemDialogOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => handleDeleteItem(item.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {items.filter(i => i.category_id === cat.id).length} items
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {cat.name}?</AlertDialogTitle>
                      <AlertDialogDescription>Items in this category will lose their category assignment.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground"
                        onClick={async () => {
                          const r = await deleteMenuCategory(cat.id)
                          if (r.error) toast.error(r.error); else toast.success('Category deleted')
                        }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <form action={async (fd) => {
            const name = fd.get('name') as string
            const r = await createMenuCategory({ name, slug: slugify(name), is_active: true, sort_order: 0 })
            if (r.error) toast.error(r.error)
            else { toast.success('Category created'); setIsCatDialogOpen(false) }
          }} className="space-y-4">
            <div><Label>Name</Label><Input name="name" required /></div>
            <Button type="submit" className="w-full">Create Category</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <ItemFormDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        item={editingItem}
        categories={categories}
      />
    </div>
  )
}

function ItemFormDialog({ open, onOpenChange, item, categories }: {
  open: boolean; onOpenChange: (o: boolean) => void; item: any; categories: any[]
}) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null)

  // Reset local state when item changes
  useEffect(() => {
    setImageUrl(item?.image_url ?? null)
  }, [item])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // Import dynamically to avoid top-level issues if needed, or assume it's imported at the top
      const { uploadFile } = await import('@/lib/supabase/storage')
      const { url, error } = await uploadFile('menu-images', file)
      
      if (error) {
        toast.error(`Upload failed: ${error}`)
      } else if (url) {
        setImageUrl(url)
        toast.success('Image uploaded successfully')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(fd: FormData) {
    const name = fd.get('name') as string
    const rawCategoryId = fd.get('category_id') as string
    const payload = {
      name,
      slug: slugify(name),
      category_id: rawCategoryId || null,
      price: parseFloat(fd.get('price') as string),
      description: (fd.get('description') as string) || undefined,
      image_url: imageUrl,
      is_available: true,
      is_featured: fd.get('is_featured') === 'on',
      is_vegetarian: fd.get('is_vegetarian') === 'on',
      is_vegan: false,
      spice_level: parseInt(fd.get('spice_level') as string) || 0,
      sort_order: parseInt(fd.get('sort_order') as string) || 0,
      tags: [] as string[],
    }
    startTransition(async () => {
      const result = item
        ? await updateMenuItem(item.id, payload)
        : await createMenuItem(payload)
      if (result.error) toast.error(result.error)
      else { toast.success(item ? 'Item updated' : 'Item created'); onOpenChange(false) }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? 'Edit Item' : 'Add Menu Item'}</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div><Label>Name *</Label><Input name="name" defaultValue={item?.name} required /></div>
          <div>
            <Label>Category</Label>
            <Select name="category_id" defaultValue={item?.category_id ?? ''}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Price (NPR) *</Label><Input name="price" type="number" step="0.01" defaultValue={item?.price} required /></div>
          
          <div className="space-y-2">
            <Label>Menu Image</Label>
            <div className="flex items-center gap-4">
              {imageUrl && (
                <div className="relative w-16 h-16 rounded overflow-hidden border">
                  <Image src={imageUrl} alt="Preview" fill className="object-cover" />
                </div>
              )}
              <div className="flex-1">
                <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                {isUploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
              </div>
            </div>
            {/* Hidden input to ensure we don't strictly need the visual input for older logic */}
            <input type="hidden" name="image_url" value={imageUrl || ''} />
          </div>

          <div><Label>Description</Label><Textarea name="description" defaultValue={item?.description} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch name="is_featured" id="feat" defaultChecked={item?.is_featured} />
              <Label htmlFor="feat">Featured</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch name="is_vegetarian" id="veg" defaultChecked={item?.is_vegetarian} />
              <Label htmlFor="veg">Vegetarian</Label>
            </div>
          </div>
          <div><Label>Spice Level (0-5)</Label><Input name="spice_level" type="number" min="0" max="5" defaultValue={item?.spice_level ?? 0} /></div>
          <div><Label>Sort Order</Label><Input name="sort_order" type="number" defaultValue={item?.sort_order ?? 0} /></div>
          <Button type="submit" className="w-full" disabled={isPending || isUploading}>
            {isPending ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
