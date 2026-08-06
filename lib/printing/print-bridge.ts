/**
 * print-bridge.ts
 *
 * Single entry point for all printing.
 *
 * Path 1 — Android Capacitor native:  TCP → 192.168.1.127:9100  (via ThermalPrinterPlugin)
 * Path 2 — Browser / iPhone PWA:      Supabase print_jobs queue → Android worker prints it
 *
 * window.print() / Android PrintManager / browser print dialog are NEVER used.
 */

'use client'

import { toast } from 'sonner'
import type { ReceiptOrder } from './escpos-formatter'
import { isNativeAndroid, nativePrintReceipt } from './thermal-plugin'
import { createPrintJob } from '@/lib/actions/print.actions'
import { createClient } from '@/lib/supabase/client'

const PRINTER_IP     = '192.168.1.127'
const PRINTER_PORT   = 9100
const RELAY_TIMEOUT  = 25_000  // 25 seconds to wait for Android to print
const HEARTBEAT_STALE = 90_000 // 90 seconds = consider POS offline

export type PrintServerDiagnostics = {
  online: boolean
  reason: string
  lastSeen: string | null
  printerConnected: boolean
  wifiConnected: boolean
}

/**
 * Check if an Android POS print server is online by reading pos_heartbeat.
 * Returns diagnostics so we can show the specific failure reason.
 */
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
      // Table might not exist yet (migration not applied)
      if (error.code === 'PGRST116' || error.code === '42P01') {
        // No rows or table doesn't exist — assume online so we don't block
        return {
          online: true,
          reason: 'Heartbeat table not set up yet — assuming online',
          lastSeen: null,
          printerConnected: true,
          wifiConnected: true,
        }
      }
      return {
        online: false,
        reason: `Database error: ${error.message}`,
        lastSeen: null,
        printerConnected: false,
        wifiConnected: false,
      }
    }

    if (!data) {
      return {
        online: false,
        reason: 'No heartbeat received — Android POS has never connected',
        lastSeen: null,
        printerConnected: false,
        wifiConnected: false,
      }
    }

    const lastSeenMs = new Date(data.last_seen).getTime()
    const ageMs = Date.now() - lastSeenMs
    const ageSeconds = Math.round(ageMs / 1000)

    if (ageMs > HEARTBEAT_STALE) {
      return {
        online: false,
        reason: `Android POS offline — last heartbeat was ${ageSeconds}s ago`,
        lastSeen: data.last_seen,
        printerConnected: data.printer_connected ?? false,
        wifiConnected: data.wifi_connected ?? false,
      }
    }

    if (!data.wifi_connected) {
      return {
        online: false,
        reason: 'Android POS WiFi is disconnected',
        lastSeen: data.last_seen,
        printerConnected: data.printer_connected ?? false,
        wifiConnected: false,
      }
    }

    return {
      online: true,
      reason: `Online — last heartbeat ${ageSeconds}s ago`,
      lastSeen: data.last_seen,
      printerConnected: data.printer_connected ?? false,
      wifiConnected: true,
    }
  } catch (e: any) {
    // Network or unexpected error — don't block printing
    console.warn('[print-bridge] heartbeat check error — assuming online:', e?.message)
    return {
      online: true,
      reason: `Heartbeat check failed (${e?.message}) — proceeding anyway`,
      lastSeen: null,
      printerConnected: true,
      wifiConnected: true,
    }
  }
}

export async function printReceipt(
  order: ReceiptOrder,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0,
  paperWidth: 58 | 80 = 80
): Promise<void> {
  if (!order) {
    toast.error('No order data to print.')
    return
  }

  // ── Path 1: Android Capacitor native ──────────────────────────────────────────
  if (isNativeAndroid()) {
    toast.loading('Sending to printer...', { id: 'print-toast' })
    try {
      console.log(`[print-bridge] Android native → TCP ${PRINTER_IP}:${PRINTER_PORT}`)
      const result = await nativePrintReceipt({
        order,
        paymentMethod,
        taxRate,
        serviceChargeRate,
        paperWidth,
        printerIp:   PRINTER_IP,
        printerPort: PRINTER_PORT,
      })
      if (result.success) {
        toast.success('Receipt printed!', { id: 'print-toast' })
      } else {
        toast.error(`Printer error: ${result.error ?? 'Unknown'}`, { id: 'print-toast' })
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Printer connection failed.', { id: 'print-toast' })
      console.error('[print-bridge] Native print error:', e)
    }
    return
  }

  // ── Path 2: Browser / iPhone PWA — Supabase relay ─────────────────────────────
  console.log('[print-bridge] Browser mode — using Supabase relay')
  toast.loading('Sending to POS printer...', { id: 'print-toast' })

  try {
    // Check Android POS heartbeat — show specific reason if offline
    const diag = await getPrintServerDiagnostics()
    console.log('[print-bridge] POS diagnostics:', diag)

    if (!diag.online) {
      toast.error(diag.reason, { id: 'print-toast', duration: 6000 })
      return
    }

    // Create print job
    console.log('[print-bridge] Creating print job in Supabase...')
    const res = await createPrintJob(order, paymentMethod, taxRate, serviceChargeRate, paperWidth)
    if (res.error || !res.data) {
      throw new Error(res.error ?? 'Failed to insert print job')
    }

    const jobId = res.data.id
    console.log(`[print-bridge] Job created: ${jobId} — waiting for Android worker (${RELAY_TIMEOUT / 1000}s timeout)...`)

    // Wait for Android worker to update the job status
    const result = await new Promise<{ success: boolean; reason: string }>((resolve) => {
      const supabase = createClient()

      const timer = setTimeout(() => {
        supabase.removeChannel(channel)
        resolve({ success: false, reason: 'Timed out — Android POS did not process the job within 25 seconds' })
      }, RELAY_TIMEOUT)

      const channel = supabase
        .channel(`print_result_${jobId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'print_jobs', filter: `id=eq.${jobId}` },
          (payload: any) => {
            const status = payload.new?.status
            console.log(`[print-bridge] Job ${jobId} → ${status}`)
            if (status === 'completed') {
              clearTimeout(timer)
              supabase.removeChannel(channel)
              resolve({ success: true, reason: 'completed' })
            } else if (status === 'failed') {
              clearTimeout(timer)
              supabase.removeChannel(channel)
              resolve({ success: false, reason: payload.new?.error_message ?? 'Printer error' })
            }
          }
        )
        .subscribe()
    })

    if (result.success) {
      toast.success('Receipt printed!', { id: 'print-toast' })
    } else {
      console.warn(`[print-bridge] Print relay failed: ${result.reason}`)
      // Show specific reason — NEVER fall back to window.print()
      toast.error(result.reason, { id: 'print-toast', duration: 8000 })
    }
  } catch (e: any) {
    console.error('[print-bridge] Relay error:', e)
    toast.error(`Print error: ${e?.message ?? 'Unknown error'}`, { id: 'print-toast' })
  }
}

export { isNativeAndroid }
