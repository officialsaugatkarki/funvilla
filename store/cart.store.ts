import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, OrderType } from '@/lib/types'

interface CartState {
  items: CartItem[]
  orderType: OrderType
  tableId: string | null
  
  // Actions
  addItem: (item: CartItem) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  updateNotes: (menuItemId: string, notes: string) => void
  setOrderType: (type: OrderType) => void
  setTableId: (id: string | null) => void
  clearCart: () => void
  
  // Selectors
  getTotalItems: () => number
  getSubtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'dine_in',
      tableId: null,

      addItem: (newItem) => {
        set((state) => {
          const existingItem = state.items.find(i => i.menuItemId === newItem.menuItemId)
          if (existingItem) {
            return {
              items: state.items.map(i => 
                i.menuItemId === newItem.menuItemId 
                  ? { ...i, quantity: i.quantity + newItem.quantity }
                  : i
              )
            }
          }
          return { items: [...state.items, newItem] }
        })
      },

      removeItem: (menuItemId) => {
        set((state) => ({
          items: state.items.filter(i => i.menuItemId !== menuItemId)
        }))
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId)
          return
        }
        set((state) => ({
          items: state.items.map(i => 
            i.menuItemId === menuItemId ? { ...i, quantity } : i
          )
        }))
      },

      updateNotes: (menuItemId, notes) => {
        set((state) => ({
          items: state.items.map(i => 
            i.menuItemId === menuItemId ? { ...i, notes } : i
          )
        }))
      },

      setOrderType: (orderType) => set({ orderType }),
      setTableId: (tableId) => set({ tableId }),
      
      clearCart: () => set({ items: [], tableId: null }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
      }
    }),
    {
      name: 'khukuri-cart-storage',
      skipHydration: true, // We'll hydrate manually to avoid SSR mismatch
    }
  )
)
