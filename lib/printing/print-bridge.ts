/**
 * print-bridge.ts
 *
 * THE single entry point for printing from anywhere in the React app.
 *
 * Usage (same call everywhere — component doesn't know about Android or iPhone):
 *   import { printReceipt } from '@/lib/printing/print-bridge'
 *   await printReceipt(order, 'cash', 13)
 *
 * Routing logic:
 *   1. Running in Android (Capacitor native): → ThermalPrinterPlugin (Kotlin TCP)
 *   2. Running in browser (including iPhone PWA): → Inserts print_job to Supabase, waits for Android to print.
 *   3. Server unreachable / user prefers image / timeout:  → canvas image → hidden iframe print
 */

'use client'

import { toast } from 'sonner'
import type { ReceiptOrder } from './escpos-formatter'
import { isNativeAndroid, nativePrintReceipt } from './thermal-plugin'
import { createPrintJob } from '@/lib/actions/print.actions'
import { createClient } from '@/lib/supabase/client'

/**
 * Print a receipt.
 *
 * @param order            Order data (from POS or DB)
 * @param paymentMethod    'cash' | 'card' | 'esewa' | 'khalti'
 * @param taxRate          Tax percentage (e.g., 13)
 * @param serviceChargeRate  Service charge percentage (e.g., 10)
 * @param paperWidth       58 | 80 — paper width in mm (default 80)
 */
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

  // ── Path 1: Android native — TCP via Capacitor ThermalPrinterPlugin ────────
  if (isNativeAndroid()) {
    try {
      toast.loading('Sending to printer...', { id: 'print-toast' })

      const result = await nativePrintReceipt({
        order,
        paymentMethod,
        taxRate,
        serviceChargeRate,
        paperWidth,
        printerIp: '192.168.1.127',
        printerPort: 9100,
      })

      if (result.success) {
        toast.success('Receipt printed successfully!', { id: 'print-toast' })
      } else {
        toast.error(`Printer error: ${result.error || 'Unknown error'}`, { id: 'print-toast' })
      }
    } catch (err: any) {
      const message = err?.message || 'Printer connection failed.'
      toast.error(message, { id: 'print-toast' })
      console.error('[printReceipt] Native print error:', err)
    }
    return
  }

  // ── Path 2: Browser / iPhone PWA — Supabase Print Relay ──────────
  // Safari and PWAs cannot open raw TCP sockets, and Vercel cannot reach local IPs.
  // We insert a print job into Supabase. The Android POS app listens for new jobs
  // and prints them locally on the network.
  toast.loading('Relaying to POS printer...', { id: 'print-toast' })
  try {
    const res = await createPrintJob(order, paymentMethod, taxRate, serviceChargeRate, paperWidth)
    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to create print job')
    }

    const jobId = res.data.id

    // Wait for the Android POS app to pick up and process the job
    const success = await new Promise<boolean>((resolve) => {
      const supabase = createClient()
      
      // Setup timeout - if Android app doesn't pick it up in 15 seconds, fallback
      const timer = setTimeout(() => {
        supabase.removeChannel(channel)
        resolve(false)
      }, 15000)

      const channel = supabase.channel(`print_job_${jobId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'print_jobs',
          filter: `id=eq.${jobId}`
        }, (payload: any) => {
          const status = payload.new.status
          if (status === 'completed') {
            clearTimeout(timer)
            supabase.removeChannel(channel)
            toast.success('Receipt printed successfully!', { id: 'print-toast' })
            resolve(true)
          } else if (status === 'failed') {
            clearTimeout(timer)
            supabase.removeChannel(channel)
            const errMsg = payload.new.error_message || 'Printer error'
            toast.error(`Print failed: ${errMsg}`, { id: 'print-toast' })
            resolve(false) // Will trigger fallback below
          }
        })
        .subscribe()
    })

    if (success) {
      return // Done!
    }

    toast.error('Print timeout or error. Showing visual receipt instead.', { id: 'print-toast' })
    // Fallback falls through to Path 3 below
  } catch (err: any) {
    console.error('[printReceipt] Supabase relay error:', err)
    toast.error('Could not reach print server. Showing visual receipt instead.', { id: 'print-toast' })
  }

  // ── Path 3: Canvas image → hidden iframe (last resort / offline fallback) ──
  // Dynamically import the canvas-based printer to avoid SSR issues
  const { printReceiptImageDirectly } = await import('@/components/admin/receipt')
  printReceiptImageDirectly(order, paymentMethod, taxRate, serviceChargeRate)
}

/**
 * Returns whether native printing is available (Android app).
 * Use this to conditionally show/hide print UI elements.
 */
export { isNativeAndroid }
