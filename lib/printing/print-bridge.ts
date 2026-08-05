/**
 * print-bridge.ts
 *
 * THE single entry point for printing from anywhere in the React app.
 *
 * Usage (same call everywhere — component doesn't know about Android):
 *   import { printReceipt } from '@/lib/printing/print-bridge'
 *   await printReceipt(order, 'cash', 13)
 *
 * Routing logic:
 *   - Running in Android (Capacitor native): → ThermalPrinterPlugin (Kotlin TCP)
 *   - Running in browser:                   → canvas image → hidden iframe print
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

  // ── Android: use native TCP socket printing ─────────────────────────────
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

  // ── Browser: canvas image → hidden iframe print ─────────────────────────
  // Dynamically import the canvas-based printer to avoid SSR issues
  const { printReceiptImageDirectly } = await import('@/components/admin/receipt')
  printReceiptImageDirectly(order, paymentMethod, taxRate, serviceChargeRate)
}

/**
 * Returns whether native printing is available (Android app).
 * Use this to conditionally show/hide print UI elements.
 */
export { isNativeAndroid }
