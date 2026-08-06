/**
 * print-bridge.ts
 *
 * THE single entry point for printing from anywhere in the React app.
 *
 * Routing logic:
 *   1. Android Capacitor native:   → ThermalPrinterPlugin  (TCP 192.168.1.127:9100)
 *   2. Browser / iPhone PWA:       → Supabase print_jobs relay  (picked up by Android worker)
 *
 * IMPORTANT: window.print() / browser print dialogs / Android PrintManager
 *            are NEVER called. ESC/POS bytes go directly over TCP only.
 */

'use client'

import { toast } from 'sonner'
import type { ReceiptOrder } from './escpos-formatter'
import { isNativeAndroid, nativePrintReceipt } from './thermal-plugin'
import { createPrintJob } from '@/lib/actions/print.actions'
import { createClient } from '@/lib/supabase/client'

const PRINTER_IP   = '192.168.1.127'
const PRINTER_PORT = 9100

// How long to wait for the Android worker to pick up the job (ms)
const RELAY_TIMEOUT_MS = 20_000

/**
 * Check if any Android POS print server has sent a heartbeat recently.
 * If the heartbeat table doesn't exist yet, we assume server is available
 * and let the job queue handle it.
 */
async function isPrintServerOnline(): Promise<boolean> {
  try {
    const supabase = createClient()
    const cutoff = new Date(Date.now() - 90_000).toISOString() // 90 seconds ago
    const { data } = await supabase
      .from('pos_heartbeat')
      .select('device_id')
      .gte('last_seen', cutoff)
      .limit(1)
    return !!(data && data.length > 0)
  } catch {
    // Table doesn't exist yet — assume server might be online
    return true
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

  // ── Path 1: Android Capacitor native ─────────────────────────────────────────
  // Direct TCP to 192.168.1.127:9100 via ThermalPrinterPlugin.
  // window.print() is NEVER called here.
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
    } catch (err: any) {
      toast.error(err?.message ?? 'Printer connection failed.', { id: 'print-toast' })
      console.error('[print-bridge] Native print error:', err)
    }
    return
  }

  // ── Path 2: Browser / iPhone PWA → Supabase relay ────────────────────────────
  // We write a print_job to Supabase. The Android POS background worker
  // picks it up and prints via TCP. window.print() is NEVER called.

  toast.loading('Sending to POS printer...', { id: 'print-toast' })

  try {
    // Quick heartbeat check — fail fast if no Android POS is online
    const serverOnline = await isPrintServerOnline()
    if (!serverOnline) {
      toast.error('No POS print server available. Is the Android POS tablet open?', { id: 'print-toast' })
      console.warn('[print-bridge] No active Android print server found (heartbeat check failed)')
      return
    }

    // Create the print job
    console.log('[print-bridge] Creating Supabase print job...')
    const res = await createPrintJob(order, paymentMethod, taxRate, serviceChargeRate, paperWidth)
    if (res.error || !res.data) {
      throw new Error(res.error ?? 'Failed to create print job')
    }

    const jobId = res.data.id
    console.log(`[print-bridge] Job created: ${jobId} — waiting for Android worker...`)

    // Wait for Android worker to mark it completed or failed
    const success = await new Promise<boolean>((resolve) => {
      const supabase = createClient()

      const timer = setTimeout(() => {
        supabase.removeChannel(channel)
        resolve(false) // Timed out
      }, RELAY_TIMEOUT_MS)

      const channel = supabase
        .channel(`print_result_${jobId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'print_jobs', filter: `id=eq.${jobId}` },
          (payload: any) => {
            const status = payload.new?.status
            console.log(`[print-bridge] Job ${jobId} status → ${status}`)
            if (status === 'completed') {
              clearTimeout(timer)
              supabase.removeChannel(channel)
              toast.success('Receipt printed!', { id: 'print-toast' })
              resolve(true)
            } else if (status === 'failed') {
              clearTimeout(timer)
              supabase.removeChannel(channel)
              const errMsg = payload.new?.error_message ?? 'Printer error'
              toast.error(`Print failed: ${errMsg}`, { id: 'print-toast' })
              resolve(false)
            }
          }
        )
        .subscribe()
    })

    if (!success) {
      // Job timed out or failed — do NOT call window.print()
      toast.error(
        'No response from POS printer. Check that the Android POS tablet is open and connected to WiFi.',
        { id: 'print-toast', duration: 6000 }
      )
      console.warn(`[print-bridge] Job ${jobId} timed out after ${RELAY_TIMEOUT_MS}ms`)
    }
  } catch (err: any) {
    console.error('[print-bridge] Relay error:', err)
    toast.error('Print relay error. Check console for details.', { id: 'print-toast' })
  }
}

export { isNativeAndroid }
