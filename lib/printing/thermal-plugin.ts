/**
 * thermal-plugin.ts
 *
 * TypeScript wrapper around the native Capacitor ThermalPrinterPlugin.
 * Keeps all Capacitor-specific imports isolated here so the rest of
 * the codebase never imports from '@capacitor/core' directly.
 */

import type { ReceiptOrder } from './escpos-formatter'

export interface PrintReceiptOptions {
  order: ReceiptOrder
  paymentMethod: string
  taxRate: number
  serviceChargeRate?: number
  /** 58 | 80  — paper width in mm. Defaults to 80. */
  paperWidth?: 58 | 80
  /** Printer IP address. Defaults to 192.168.1.127 */
  printerIp?: string
  /** Printer port. Defaults to 9100 */
  printerPort?: number
}

export interface PrintResult {
  success: boolean
  error?: string
}

/**
 * Call the native ThermalPrinterPlugin from Kotlin.
 * Only works inside the Android Capacitor shell.
 * Throws if called from a plain browser (no Capacitor runtime).
 */
export async function nativePrintReceipt(
  options: PrintReceiptOptions
): Promise<PrintResult> {
  // Lazy-import Capacitor so this file is safe to import on the server
  // (it won't explode during Next.js SSR builds)
  const { Capacitor, registerPlugin } = await import('@capacitor/core')

  if (!Capacitor.isNativePlatform()) {
    throw new Error('nativePrintReceipt: not running on a native platform')
  }

  // Register the plugin by name — must match the plugin registered in MainActivity.kt
  const ThermalPrinter = registerPlugin<{
    printReceipt(opts: PrintReceiptOptions): Promise<PrintResult>
  }>('ThermalPrinter')

  return ThermalPrinter.printReceipt({
    printerIp: '192.168.1.127',
    printerPort: 9100,
    paperWidth: 80,
    ...options,
  })
}

/**
 * Returns true if the app is running inside the Capacitor Android shell.
 * Safe to call during SSR (returns false).
 */
export function isNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // @ts-ignore — Capacitor injects itself on window when running natively
    return !!(window.Capacitor?.isNativePlatform?.())
  } catch {
    return false
  }
}
