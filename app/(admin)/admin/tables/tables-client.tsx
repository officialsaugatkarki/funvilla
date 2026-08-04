'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { toast } from 'sonner'
import { Users, Wifi, WifiOff } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { updateTableStatus } from '@/lib/actions/orders.actions'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const STATUS_STYLES: Record<string, { bg: string; border: string; dot: string }> = {
  available: { bg: 'bg-emerald-50', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  occupied:  { bg: 'bg-red-50', border: 'border-red-300', dot: 'bg-red-500' },
  reserved:  { bg: 'bg-amber-50', border: 'border-amber-300', dot: 'bg-amber-500' },
  cleaning:  { bg: 'bg-sky-50', border: 'border-sky-300', dot: 'bg-sky-500' },
  disabled:  { bg: 'bg-muted/50', border: 'border-border', dot: 'bg-muted-foreground' },
}

export default function TablesClient({ tables: initialTables, canAccessPOS = true }: { tables: any[], canAccessPOS?: boolean }) {
  const [tables, setTables] = useState(initialTables)
  const [filter, setFilter] = useState('all')
  const [isLive, setIsLive] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Realtime subscription for table status changes
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('tables-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurant_tables' },
        (payload: any) => {
          setTables(prev =>
            prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)
          )
          toast.info(`Table ${payload.new.table_number} status changed to ${payload.new.status}`)
        }
      )
      .subscribe((status: string) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const counts = {
    all: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
  }

  const displayed = filter === 'all' ? tables : tables.filter(t => t.status === filter)

  function handleStatusChange(tableId: string, status: string) {
    startTransition(async () => {
      const { error } = await updateTableStatus(tableId, status)
      if (error) toast.error(error)
      else {
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t))
        toast.success('Table status updated')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> Table Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {counts.available} available · {counts.occupied} occupied · {counts.reserved} reserved
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isLive ? (
            <Badge className="gap-1.5 bg-emerald-100 text-emerald-700 border-emerald-300">
              <Wifi className="h-3 w-3" /> LIVE
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              <WifiOff className="h-3 w-3" /> Connecting...
            </Badge>
          )}
          {canAccessPOS && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/pos">Go to POS</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'available', 'occupied', 'reserved', 'cleaning'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize',
              filter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-foreground'
            )}
          >
            {f === 'all' ? `All (${counts.all})` : `${f} (${counts[f as keyof typeof counts] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {displayed.map(table => {
          const style = STATUS_STYLES[table.status] ?? STATUS_STYLES.available
          return (
            <div
              key={table.id}
              className={cn(
                'rounded-xl border-2 p-4 transition-all',
                style.bg,
                style.border,
                isPending && 'opacity-50'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">T{table.table_number}</span>
                <span className={cn('h-2.5 w-2.5 rounded-full', style.dot)} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">
                <Users className="h-3 w-3 inline mr-1" />{table.capacity} seats
              </p>
              {table.section && (
                <p className="text-xs text-muted-foreground mb-2">{table.section}</p>
              )}
              <Select
                value={table.status}
                onValueChange={(val) => handleStatusChange(table.id, val)}
                disabled={isPending}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )
        })}
        {displayed.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No tables in this status.
          </div>
        )}
      </div>
    </div>
  )
}
