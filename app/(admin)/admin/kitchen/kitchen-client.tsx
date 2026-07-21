'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getKitchenOrders, updateOrderItemStatus } from '@/lib/actions/orders.actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ChefHat, Check, Clock, Wifi, WifiOff } from 'lucide-react'

// Simple timer component to show elapsed time
function ElapsedTime({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const start = new Date(startTime).getTime()
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const diff = Math.floor((now - start) / 60000) // in minutes
      setElapsed(`${diff}m`)
    }, 10000) // update every 10 seconds

    // Initial calc
    const now = new Date().getTime()
    setElapsed(`${Math.floor((now - start) / 60000)}m`)

    return () => clearInterval(interval)
  }, [startTime])

  return <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3"/> {elapsed}</span>
}

export default function KitchenClient({ initialOrders }: { initialOrders: any[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [isLive, setIsLive] = useState(false)

  const refreshOrders = async () => {
    const { data } = await getKitchenOrders()
    if (data) setOrders(data)
  }

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('kitchen-display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        refreshOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        refreshOrders()
      })
      .subscribe((status: string) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    // Fallback polling
    const interval = setInterval(refreshOrders, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  async function handleStatusChange(itemId: string, newStatus: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled') {
    const result = await updateOrderItemStatus(itemId, newStatus)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Item updated')
      // Optimistic update
      setOrders(prev => prev.map(order => ({
        ...order,
        order_items: order.order_items.map((item: any) => 
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      })))
    }
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-muted-foreground">
        <ChefHat className="h-24 w-24 mb-4 opacity-20" />
        <h2 className="text-2xl font-semibold">Kitchen is quiet</h2>
        <p>No active orders at the moment</p>
        <div className="mt-8 flex items-center gap-2">
           {isLive ? <><span className="h-3 w-3 bg-green-500 rounded-full animate-pulse"/> Live Connection Active</> : <><WifiOff className="w-4 h-4"/> Offline</>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Kitchen Display</h1>
        <div className="flex items-center gap-4">
          {isLive ? (
             <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-300 gap-1.5 px-3 py-1 text-sm">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
               </span>
               Live
             </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5"><WifiOff className="w-3 h-3"/> Reconnecting...</Badge>
          )}
          <Button variant="outline" onClick={refreshOrders}>Manual Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.map(order => {
          const tableInfo = order.restaurant_tables?.table_number ? `Table ${order.restaurant_tables.table_number}` : order.order_type.replace('_', ' ')
          
          return (
            <Card key={order.id} className="border-t-4 border-t-primary shadow-md h-fit">
              <CardHeader className="py-3 px-4 bg-muted/30 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">#{order.order_number}</CardTitle>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mt-1">{tableInfo}</p>
                </div>
                <div className="text-right">
                  <ElapsedTime startTime={order.created_at} />
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {order.order_items.map((item: any) => {
                  // Only show items that are not served/cancelled
                  if (item.status === 'served' || item.status === 'cancelled') return null

                  return (
                    <div key={item.id} className={`p-4 transition-colors ${item.status === 'ready' ? 'bg-green-50/50' : ''}`}>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <p className="font-semibold text-lg leading-tight">
                          <span className="text-primary mr-2">{item.quantity}x</span>
                          {item.menu_item_name}
                        </p>
                      </div>
                      
                      {item.notes && (
                        <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded mb-3 border border-amber-200">
                          {item.notes}
                        </p>
                      )}

                      <div className="flex gap-2 mt-3">
                        {item.status === 'pending' && (
                          <Button 
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white" 
                            size="sm"
                            onClick={() => handleStatusChange(item.id, 'preparing')}
                          >
                            Start Preparing
                          </Button>
                        )}
                        {item.status === 'preparing' && (
                          <Button 
                            className="w-full bg-green-500 hover:bg-green-600 text-white" 
                            size="sm"
                            onClick={() => handleStatusChange(item.id, 'ready')}
                          >
                            Mark Ready
                          </Button>
                        )}
                        {item.status === 'ready' && (
                          <Button 
                            variant="outline"
                            className="w-full" 
                            size="sm"
                            onClick={() => handleStatusChange(item.id, 'served')}
                          >
                            <Check className="w-4 h-4 mr-2"/> Served
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {order.notes && (
                  <div className="p-3 bg-muted/50 text-sm">
                    <span className="font-semibold">Order Note:</span> {order.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
