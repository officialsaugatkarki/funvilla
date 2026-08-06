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
 *   2. Running in browser (including iPhone PWA): → POST /api/print (server TCP)
 *   3. Server unreachable / user prefers image:  → canvas image → hidden iframe print
 */

'use client'

import { toast } from 'sonner'
import type { ReceiptOrder } from './escpos-formatter'
import { isNativeAndroid, nativePrintReceipt } from './thermal-plugin'

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
  // Unchanged from before.
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

  // ── Path 2: Browser / iPhone PWA — server-side TCP via /api/print ──────────
  // Safari and PWAs cannot open raw TCP sockets, so we POST the order data
  // to our Next.js API route which runs in Node.js on the server and opens
  // the TCP connection from there. This works on iPhone Safari, Android Chrome
  // in browser mode, and any other browser accessing the management system.
  toast.loading('Sending to printer...', { id: 'print-toast' })
  try {
    const res = await fetch('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, paymentMethod, taxRate, serviceChargeRate, paperWidth }),
    })

    const json = await res.json().catch(() => ({ success: false, error: 'Invalid response' }))

    if (res.ok && json.success) {
      toast.success('Receipt printed successfully!', { id: 'print-toast' })
      return
    }

    // Server reported an error (printer offline, validation failure, etc.)
    const errMsg: string = json.error ?? `Server error ${res.status}`
    console.error('[printReceipt] Server print error:', errMsg)
    toast.error(`Print failed: ${errMsg}`, { id: 'print-toast' })

    // ── Fallback: if the server print fails, fall through to canvas image ──
    // (e.g. printer is offline but user still wants a visual receipt image)
    const { printReceiptImageDirectly } = await import('@/components/admin/receipt')
    printReceiptImageDirectly(order, paymentMethod, taxRate, serviceChargeRate)
    return
  } catch (err: any) {
    // Network error reaching our own API (very unlikely on Vercel, but handle it)
    console.error('[printReceipt] fetch /api/print error:', err)
    toast.error('Could not reach print server. Falling back to image print.', { id: 'print-toast' })
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
