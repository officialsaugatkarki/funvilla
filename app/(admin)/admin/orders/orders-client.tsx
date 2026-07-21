'use client'

import { useState, useEffect } from 'react'
import { Package, Search, Filter, Eye, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { updateOrderStatus } from '@/lib/actions/orders.actions'
import type { OrderWithDetails } from '@/lib/types'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function OrdersClient({ initialOrders }: { initialOrders: OrderWithDetails[] }) {
  const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // Subscribing to realtime updates will be implemented in Phase 4. 
  // For now, this is a static list based on initial render.

  async function handleCancelOrder(orderId: string) {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setLoadingAction(orderId)
    const { error } = await updateOrderStatus(orderId, 'cancelled')
    if (error) {
      toast.error(error)
    } else {
      toast.success('Order cancelled')
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'cancelled' })
      }
    }
    setLoadingAction(null)
  }

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.order_number.toLowerCase().includes(search.toLowerCase()) || 
      o.customer_name_resolved?.toLowerCase().includes(search.toLowerCase()) ||
      o.table_number?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" /> Orders
          </h1>
          <p className="text-muted-foreground">Manage and track all restaurant orders.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search order #, customer, table..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="pl-9" 
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground"/>
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="served">Served</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders found.</TableCell></TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {order.order_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.table_number && <span>Table {order.table_number}</span>}
                          {order.customer_name_resolved && <span>{order.table_number && ' • '} {order.customer_name_resolved}</span>}
                          {!order.table_number && !order.customer_name_resolved && <span className="text-muted-foreground">Walk-in</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-primary">Rs. {order.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'completed' ? 'default' :
                          order.status === 'cancelled' ? 'destructive' : 'secondary'
                        } className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details: {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selectedOrder.order_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={selectedOrder.status === 'completed' ? 'default' : selectedOrder.status === 'cancelled' ? 'destructive' : 'secondary'} className="capitalize mt-1">
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Created By</p>
                  <p className="font-medium">{selectedOrder.created_by_name || 'System'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
                {selectedOrder.notes && (
                  <div className="col-span-2 bg-muted p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Order Notes</p>
                    <p>{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div className="border rounded-md p-4 bg-muted/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Financials</h3>
                  <Badge variant={selectedOrder.payment_status === 'paid' ? 'default' : 'outline'}>
                    {selectedOrder.payment_status === 'paid' ? 'PAID' : 'UNPAID'}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Rs. {selectedOrder.subtotal.toLocaleString()}</span></div>
                  {selectedOrder.discount_amount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-Rs. {selectedOrder.discount_amount.toLocaleString()}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>Rs. {selectedOrder.tax_amount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Service Charge</span><span>Rs. {selectedOrder.service_charge_amount.toLocaleString()}</span></div>
                  <div className="flex justify-between pt-2 border-t font-bold text-lg"><span>Total</span><span>Rs. {selectedOrder.total.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    disabled={loadingAction === selectedOrder.id}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> 
                    {loadingAction === selectedOrder.id ? 'Cancelling...' : 'Cancel Order'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
