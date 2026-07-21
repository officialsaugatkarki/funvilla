'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export default function NotificationsBell({ restaurantId }: { restaurantId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    const supabase = createClient()

    // Fetch existing unread notifications
    supabase
      .from('notifications')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20)
      .then((res: any) => {
        const { data } = res
        if (data) setNotifications(data)
      })

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: any) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          toast.info(newNotification.title, {
            description: newNotification.message,
            duration: 5000,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId])

  async function markAllRead() {
    const supabase = createClient()
    const ids = notifications.filter(n => !n.is_read).map(n => n.id)
    if (ids.length === 0) return

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  function getNotificationIcon(type: string) {
    const icons: Record<string, string> = {
      new_order: '🍽️',
      booking: '🏨',
      room_ready: '🛏️',
      low_stock: '⚠️',
      payment: '💳',
      employee_login: '👤',
    }
    return icons[type] ?? '🔔'
  }

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllRead() }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 text-white border-0 rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.slice(0, 15).map(n => (
            <DropdownMenuItem
              key={n.id}
              className={`flex flex-col items-start gap-1 p-3 cursor-default ${!n.is_read ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-base">{getNotificationIcon(n.type)}</span>
                <span className="font-medium text-sm flex-1">{n.title}</span>
                {!n.is_read && (
                  <span className="h-2 w-2 bg-primary rounded-full shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground pl-6">{n.message}</p>
              <p className="text-[10px] text-muted-foreground/60 pl-6">
                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
