/**
 * print-bridge.ts
 *
 * Single entry point for ALL printing across all platforms.
 *
 * Routing:
 *   Android Capacitor APK  →  USB / TCP → native ESC/POS printer (direct)
 *   Desktop browser (Mac, Windows, Linux) → window.print() → OS printer dialog
 *   iPhone Safari PWA      →  Supabase relay → Android worker → printer
 *
 * window.print() IS now used for desktop browsers.
 * The Supabase relay is used only for iPhone/iPad PWA.
 */

'use client'

import { toast } from 'sonner'
import { isNativeAndroid, nativePrintReceipt, isPOSWorkerMode } from './thermal-plugin'
import { createPrintJob } from '@/lib/actions/print.actions'
import { createClient } from '@/lib/supabase/client'
import { buildReceiptHtml } from '@/components/admin/receipt'
import { buildPoolTicketHtml, buildPoolTicketTextLines, type PoolTicketData } from './pool-ticket'
import { buildSwimmingTicketHtml, buildSwimmingTicketTextLines, type SwimmingTicketData } from './swimming-ticket'

const RELAY_TIMEOUT   = 45_000   // 45s hard timeout
const POLL_INTERVAL   = 2_000    // Poll every 2s as fallback (Realtime can miss events)
const HEARTBEAT_STALE = 60_000   // 60s = POS is offline

function plog(msg: string, data?: any) {
  const ts = new Date().toISOString()
  data !== undefined
    ? console.log(`[Print ${ts}] ${msg}`, data)
    : console.log(`[Print ${ts}] ${msg}`)
}

// ─── Platform detection ───────────────────────────────────────────────────────

/** True when running as a standalone iOS PWA (Add to Home Screen) */
export function isIOSPWA(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

/** True when running in any regular desktop/laptop browser (not Android native, not POS worker) */
export function isDesktopBrowser(): boolean {
  if (typeof window === 'undefined') return false
  return !isNativeAndroid() && !isPOSWorkerMode()
}

export function isBrowserClient(): boolean {
  return !isNativeAndroid() && !isPOSWorkerMode()
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────
export type PrintServerDiagnostics = {
  online: boolean
  reason: string
  lastSeen: string | null
  printerConnected: boolean
  wifiConnected: boolean
  deviceName: string | null
}

export async function getPrintServerDiagnostics(): Promise<PrintServerDiagnostics> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('pos_heartbeat')
      .select('*')
      .order('last_seen', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return { online: false, reason: 'No heartbeat received — open the Android POS app', lastSeen: null, printerConnected: false, wifiConnected: false, deviceName: null }
      if (error.code === '42P01')    return { online: true,  reason: 'Heartbeat table not set up yet — proceeding', lastSeen: null, printerConnected: true, wifiConnected: true, deviceName: null }
      return { online: false, reason: `Database error: ${error.message}`, lastSeen: null, printerConnected: false, wifiConnected: false, deviceName: null }
    }

    if (!data) return { online: false, reason: 'No heartbeat received — open the Android POS app', lastSeen: null, printerConnected: false, wifiConnected: false, deviceName: null }

    const ageMs  = Date.now() - new Date(data.last_seen).getTime()
    const ageSec = Math.round(ageMs / 1000)

    if (!data.wifi_connected)    return { online: false, reason: 'Android POS WiFi is disconnected', lastSeen: data.last_seen, printerConnected: data.printer_connected, wifiConnected: false, deviceName: data.device_name }
    if (ageMs > HEARTBEAT_STALE) return { online: false, reason: `Restaurant printer is offline. (Last heartbeat ${ageSec}s ago)`, lastSeen: data.last_seen, printerConnected: data.printer_connected, wifiConnected: data.wifi_connected, deviceName: data.device_name }

    return { online: true, reason: `Online — last heartbeat ${ageSec}s ago`, lastSeen: data.last_seen, printerConnected: data.printer_connected, wifiConnected: data.wifi_connected, deviceName: data.device_name }
  } catch (e: any) {
    console.warn('[print-bridge] Heartbeat check exception:', e?.message)
    return { online: true, reason: 'Heartbeat check failed — proceeding anyway', lastSeen: null, printerConnected: true, wifiConnected: true, deviceName: null }
  }
}

// ─── PATH A: Desktop browser → OS native print dialog ────────────────────────
/**
 * Opens the receipt in a small popup window and triggers window.print().
 * This opens the OS native printer dialog on Mac, Windows, Linux, etc.
 * The user can choose any printer (including PDF).
 */
export function printReceiptBrowser(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0,
  paperWidth: 58 | 80 = 80,
  waiter: string = '',
  isPaid: boolean = true
): void {
  if (!order) {
    toast.error('No order data to print.')
    return
  }

  plog('PATH A: Desktop browser → window.print()')

  try {
    const html = buildReceiptHtml(order, paymentMethod, taxRate, serviceChargeRate, waiter, isPaid)

    // Open a small popup window — this is the cleanest cross-browser approach.
    // The HTML document auto-calls window.print() on load (see buildReceiptHtml).
    const popup = window.open('', '_blank', 'width=400,height=700,scrollbars=yes,resizable=yes')
    if (!popup) {
      // Popup blocked — fall back to a hidden iframe approach
      plog('PATH A: Popup blocked, falling back to iframe print')
      printViaIframe(html)
      return
    }

    popup.document.open()
    popup.document.write(html)
    popup.document.close()

    // Some browsers need a short delay before the print dialog fires
    popup.addEventListener('afterprint', () => {
      popup.close()
    })

    toast.success('Print dialog opened!', { duration: 3000 })
    plog('PATH A: Popup opened successfully')
  } catch (e: any) {
    plog('PATH A ERROR:', e?.message)
    toast.error(`Print error: ${e?.message ?? 'Could not open print dialog'}`)
  }
}

/** Fallback: inject a hidden iframe, write receipt HTML into it, and print */
function printViaIframe(html: string): void {
  // Remove any previous print frame
  const existing = document.getElementById('receipt-print-frame')
  if (existing) existing.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'receipt-print-frame'
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;pointer-events:none;'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    toast.error('Could not open print frame. Please allow popups for this site.')
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  // Wait for resources to load before printing
  iframe.onload = () => {
    iframe.contentWindow?.print()
    toast.success('Print dialog opened!', { duration: 3000 })
    // Clean up after print
    setTimeout(() => iframe.remove(), 5000)
  }
}

// ─── Main print function ──────────────────────────────────────────────────────
export async function printReceipt(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0,
  paperWidth: 58 | 80 = 80,
  waiter: string = '',
  isPaid: boolean = true
): Promise<void> {
  if (!order) { toast.error('No order data to print.'); return }

  // ── PATH 1: Android Native App — direct Network to thermal printer ──────────
  // Default: 192.168.1.127:9100 over TCP. Overridable via pos_printer_config.
  if (isNativeAndroid()) {
    let connectionType: 'usb' | 'network' = 'network'
    let printerIp = '192.168.1.127'
    let printerPort = 9100
    let configPaperWidth: 58 | 80 = paperWidth

    try {
      const stored = localStorage.getItem('pos_printer_config')
      if (stored) {
        const config = JSON.parse(stored)
        if (config.connectionType) connectionType = config.connectionType
        if (config.printerIp) printerIp = config.printerIp
        if (config.printerPort) printerPort = parseInt(config.printerPort, 10)
        if (config.paperWidth) configPaperWidth = parseInt(config.paperWidth, 10) as 58 | 80
      }
    } catch (e) {
      console.warn('Could not read printer config, using defaults', e)
    }

    toast.loading(`Printing receipt...`, { id: 'print-toast' })
    plog(`PATH 1: Android Native → ${connectionType.toUpperCase()}`)

    const result = await nativePrintReceipt({
      order,
      paymentMethod,
      taxRate,
      serviceChargeRate,
      paperWidth: configPaperWidth,
      connectionType,
      printerIp,
      printerPort,
      waiter,
      isPaid,
    })

    plog('PATH 1 result:', result)
    if (result.success) {
      toast.success('Receipt printed!', { id: 'print-toast' })
    } else {
      if (connectionType === 'usb') {
        toast.error(`USB Print Error: ${result.error ?? 'Check USB connection'}`, { id: 'print-toast' })
      } else {
        toast.error(`Network Print Error: ${result.error ?? 'Check network connection'}`, { id: 'print-toast' })
      }
    }
    return
  }

  // ── PATH 2: Locally-configured browser device with printer IP ───────────────
  try {
    const stored = localStorage.getItem('pos_printer_config')
    if (stored) {
      const config = JSON.parse(stored)
      if (config.printerIp && config.connectionType === 'network') {
        plog('PATH 2: Browser with local network printer config → native attempt')
        const result = await nativePrintReceipt({
          order,
          paymentMethod,
          taxRate,
          serviceChargeRate,
          paperWidth: config.paperWidth ? parseInt(config.paperWidth, 10) as 58 | 80 : paperWidth,
          connectionType: 'network',
          printerIp: config.printerIp,
          printerPort: config.printerPort ? parseInt(config.printerPort, 10) : 9100,
          waiter,
          isPaid,
        })
        if (result.success) {
          toast.success('Receipt printed!', { id: 'print-toast' })
          return
        }
        plog('PATH 2: Local config print failed, falling through:', result.error)
      }
    }
  } catch (e) {
    plog('PATH 2: Could not read/use local printer config:', e)
  }

  // ── PATH 3: Desktop browser / Mac / Windows → OS native print dialog ────────
  plog('PATH 3: Desktop browser → OS print dialog (window.print)')
  printReceiptBrowser(order, paymentMethod, taxRate, serviceChargeRate, paperWidth, waiter, isPaid)
}

// ─── Wait for job completion — Realtime + polling fallback ────────────────────
// Kept for backward compatibility (used in iOS PWA relay path if ever re-enabled)
function waitForJobCompletion(jobId: string): Promise<{ success: boolean; reason: string }> {
  return new Promise((resolve) => {
    const supabase = createClient()
    let settled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null

    const finish = (result: { success: boolean; reason: string }) => {
      if (settled) return
      settled = true
      plog(`FINISH: success=${result.success}, reason=${result.reason}`)
      if (pollTimer) clearInterval(pollTimer)
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      clearTimeout(hardTimeout)
      try { supabase.removeChannel(channel) } catch {}
      resolve(result)
    }

    const hardTimeout = setTimeout(() => {
      plog(`TIMEOUT: Job ${jobId} not completed within ${RELAY_TIMEOUT}ms`)
      finish({ success: false, reason: 'Timed out — the kitchen printer did not respond. Please try again.' })
    }, RELAY_TIMEOUT)

    pollTimer = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('print_jobs')
          .select('status, error_message')
          .eq('id', jobId)
          .single()

        plog(`POLL: job ${jobId} status=${data?.status ?? 'null'}, error=${error?.message ?? 'none'}`)

        if (error) { plog('POLL error:', error.message); return }
        if (!data) return

        if (data.status === 'completed') {
          finish({ success: true, reason: 'completed' })
        } else if (data.status === 'failed') {
          finish({ success: false, reason: data.error_message ?? 'Printer error — please try again' })
        }
      } catch (e: any) {
        plog('POLL exception:', e?.message)
      }
    }, POLL_INTERVAL)

    heartbeatTimer = setInterval(async () => {
      const diag = await getPrintServerDiagnostics()
      plog(`HEARTBEAT CHECK while waiting: online=${diag.online}`)
      if (!diag.online) {
        finish({ success: false, reason: `Kitchen POS went offline: ${diag.reason}` })
      }
    }, 10_000)

    plog(`REALTIME: subscribing to print_jobs UPDATE where id=${jobId}`)
    const channel = supabase
      .channel(`print_result_${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'print_jobs', filter: `id=eq.${jobId}` },
        (payload: any) => {
          const status = payload.new?.status
          plog(`REALTIME EVENT: job ${jobId} → status=${status}`, payload.new)
          if (status === 'completed') {
            finish({ success: true, reason: 'completed' })
          } else if (status === 'failed') {
            finish({ success: false, reason: payload.new?.error_message ?? 'Printer error — please try again' })
          }
        }
      )
      .subscribe()
  })
}

// ─── Pool Ticket Printing ─────────────────────────────────────────────────────

/**
 * Prints a swimming pool ticket.
 * - Android native: sends ESC/POS-compatible data via nativePrintReceipt
 * - Desktop browser: opens a popup with the ticket HTML and calls window.print()
 */
export async function printPoolTicket(ticket: PoolTicketData): Promise<void> {
  if (!ticket) { toast.error('No ticket data to print.'); return }

  // ── Android Native ─────────────────────────────────────────────────────────
  if (isNativeAndroid()) {
    let connectionType: 'usb' | 'network' = 'network'
    let printerIp   = '192.168.1.127'
    let printerPort = 9100
    let paperWidth: 58 | 80 = 80

    try {
      const stored = localStorage.getItem('pos_printer_config')
      if (stored) {
        const cfg = JSON.parse(stored)
        if (cfg.connectionType) connectionType = cfg.connectionType
        if (cfg.printerIp)      printerIp      = cfg.printerIp
        if (cfg.printerPort)    printerPort    = parseInt(cfg.printerPort, 10)
        if (cfg.paperWidth)     paperWidth     = parseInt(cfg.paperWidth, 10) as 58 | 80
      }
    } catch (e) {
      console.warn('Could not read printer config, using defaults', e)
    }

    toast.loading('Printing pool ticket...', { id: 'pool-print-toast' })

    // Adapt the pool ticket into the receipt order shape the native plugin expects.
    // We re-use the nativePrintReceipt path; the plugin reads `order.items` to build
    // ESC/POS lines, so we supply the pool ticket as a single line item.
    const fakeOrder = {
      order_number: ticket.ticket_number || ticket.id.split('-')[0].toUpperCase(),
      created_at:   ticket.check_in_time || ticket.created_at || new Date().toISOString(),
      order_type:   'pool_ticket',
      subtotal:     ticket.price,
      total:        ticket.price,
      items: [{
        name:     `${ticket.notes || ticket.ticket_type} Ticket`,
        quantity: ticket.visitor_count,
        price:    ticket.price / (ticket.visitor_count || 1),
      }],
      _pool_ticket: ticket,   // pass full ticket data for custom formatting
    }

    const result = await nativePrintReceipt({
      order:        fakeOrder,
      paymentMethod: ticket.payment_method,
      taxRate:       0,
      serviceChargeRate: 0,
      paperWidth,
      connectionType,
      printerIp,
      printerPort,
      isPaid: true,
    })

    if (result.success) {
      toast.success('Pool ticket printed!', { id: 'pool-print-toast' })
    } else {
      toast.error(`Print error: ${result.error ?? 'Check printer connection'}`, { id: 'pool-print-toast' })
    }
    return
  }

  // ── Desktop browser / fallback ─────────────────────────────────────────────
  plog('POOL TICKET: Desktop browser → window.print()')
  try {
    const html = buildPoolTicketHtml(ticket)
    const popup = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes')
    if (!popup) {
      // Popup blocked — use iframe fallback
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;pointer-events:none;'
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow?.document
      if (doc) {
        doc.open(); doc.write(html); doc.close()
        iframe.onload = () => {
          iframe.contentWindow?.print()
          toast.success('Print dialog opened!', { duration: 3000 })
          setTimeout(() => iframe.remove(), 5000)
        }
      }
      return
    }
    popup.document.open()
    popup.document.write(html)
    popup.document.close()
    popup.addEventListener('afterprint', () => popup.close())
    toast.success('Print dialog opened!', { duration: 3000 })
  } catch (e: any) {
    toast.error(`Print error: ${e?.message ?? 'Could not open print dialog'}`)
  }
}


// ─── Swimming Ticket Printing ──────────────────────────────────────────────────

export async function printSwimmingTicket(ticket: SwimmingTicketData): Promise<void> {
  if (!ticket) { toast.error('No ticket data to print.'); return }

  if (isNativeAndroid()) {
    let connectionType: 'usb' | 'network' = 'network'
    let printerIp   = '192.168.1.127'
    let printerPort = 9100
    let paperWidth: 58 | 80 = 80

    try {
      const stored = localStorage.getItem('pos_printer_config')
      if (stored) {
        const cfg = JSON.parse(stored)
        if (cfg.connectionType) connectionType = cfg.connectionType
        if (cfg.printerIp)      printerIp      = cfg.printerIp
        if (cfg.printerPort)    printerPort    = parseInt(cfg.printerPort, 10)
        if (cfg.paperWidth)     paperWidth     = parseInt(cfg.paperWidth, 10) as 58 | 80
      }
    } catch (e) {
      console.warn('Could not read printer config, using defaults', e)
    }

    toast.loading('Printing swimming ticket...', { id: 'swim-print-toast' })

    const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
    const label = ticket.notes || `${ticket.ticket_type} Ticket`

    // Visitor info as zero-price line items so they print on the receipt
    const visitorLines: { name: string; quantity: number; price: number }[] = []
    if (ticket.visitor_name)    visitorLines.push({ name: `Name    : ${ticket.visitor_name}`,    quantity: 1, price: 0 })
    if (ticket.visitor_phone)   visitorLines.push({ name: `Phone   : ${ticket.visitor_phone}`,   quantity: 1, price: 0 })
    if (ticket.visitor_address) visitorLines.push({ name: `Address : ${ticket.visitor_address}`, quantity: 1, price: 0 })
    if (ticket.visitor_gender)  visitorLines.push({ name: `Gender  : ${cap(ticket.visitor_gender)}`, quantity: 1, price: 0 })

    const fakeOrder = {
      order_number: ticket.ticket_number || ticket.id.split('-')[0].toUpperCase(),
      created_at:   ticket.check_in_time || ticket.created_at || new Date().toISOString(),
      order_type:   'swimming_ticket',
      subtotal:     ticket.price,
      total:        ticket.price,
      items: [
        { name: label, quantity: 1, price: ticket.price },
        ...(visitorLines.length > 0 ? [{ name: '- - - Visitor Info - - -', quantity: 1, price: 0 }] : []),
        ...visitorLines,
      ],
    }

    const result = await nativePrintReceipt({
      order:        fakeOrder,
      paymentMethod: ticket.payment_method,
      taxRate:       0,
      serviceChargeRate: 0,
      paperWidth,
      connectionType,
      printerIp,
      printerPort,
      isPaid: true,
    })

    if (result.success) {
      toast.success('Swimming ticket printed!', { id: 'swim-print-toast' })
    } else {
      toast.error(`Print error: ${result.error ?? 'Check printer connection'}`, { id: 'swim-print-toast' })
    }
    return
  }

  plog('SWIMMING TICKET: Desktop browser → window.print()')
  try {
    const html = buildSwimmingTicketHtml(ticket)
    const popup = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes')
    if (!popup) {
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;pointer-events:none;'
      document.body.appendChild(iframe)
      const doc = iframe.contentWindow?.document
      if (doc) {
        doc.open(); doc.write(html); doc.close()
        iframe.onload = () => {
          iframe.contentWindow?.print()
          toast.success('Print dialog opened!', { duration: 3000 })
          setTimeout(() => iframe.remove(), 5000)
        }
      }
      return
    }
    popup.document.open()
    popup.document.write(html)
    popup.document.close()
    popup.addEventListener('afterprint', () => popup.close())
    toast.success('Print dialog opened!', { duration: 3000 })
  } catch (e: any) {
    toast.error(`Print error: ${e?.message ?? 'Could not open print dialog'}`)
  }
}

export { isNativeAndroid, isPOSWorkerMode }
