/**
 * thermal-plugin.ts
 *
 * TypeScript wrapper around the native Capacitor ThermalPrinterPlugin.
 *
 * IMPORTANT: Capacitor bridge is injected asynchronously into the WebView.
 * Never import Capacitor at module load time — always check lazily at runtime.
 */

export interface PrintReceiptOptions {
  order: any
  paymentMethod: string
  taxRate: number
  serviceChargeRate?: number
  paperWidth?: 58 | 80
  connectionType?: 'usb' | 'network'
  printerIp?: string
  printerPort?: number
}

export interface PrintResult {
  success: boolean
  error?: string
}

/**
 * Returns true ONLY when running inside the Capacitor Android native shell.
 *
 * We check LAZILY at runtime — never at import time — because the Capacitor
 * bridge is injected by the native WebView AFTER JavaScript modules are
 * evaluated.
 *
 * We check three ways in priority order:
 *  1. window.Capacitor.isNativePlatform() — the raw runtime bridge
 *  2. window.Capacitor.getPlatform() === 'android'
 *  3. The localStorage POS_MODE flag (for browser-based debugging)
 */
export function isNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const cap = (window as any).Capacitor
    if (cap && typeof cap.isNativePlatform === 'function') {
      return cap.isNativePlatform() === true && cap.getPlatform?.() === 'android'
    }
    return false
  } catch {
    return false
  }
}

/**
 * Returns true if this device is in "POS Worker Mode".
 * This is true when:
 *  - Running as native Android Capacitor APK, OR
 *  - The user has manually enabled POS mode via the Diagnostics page
 *    (stored in localStorage, for browser-based POS tablets)
 */
export function isPOSWorkerMode(): boolean {
  if (typeof window === 'undefined') return false
  if (isNativeAndroid()) return true
  try {
    return localStorage.getItem('pos_worker_mode') === 'true'
  } catch {
    return false
  }
}

export function enablePOSWorkerMode() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pos_worker_mode', 'true')
    console.log('[POS] POS Worker Mode enabled in localStorage')
  }
}

export function disablePOSWorkerMode() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pos_worker_mode')
    console.log('[POS] POS Worker Mode disabled')
  }
}

/**
 * Calls the native Capacitor ThermalPrinterPlugin.
 * Only works inside the Android Capacitor APK.
 */
export async function nativePrintReceipt(
  options: PrintReceiptOptions
): Promise<PrintResult> {
  const cap = (window as any).Capacitor
  if (!cap || !cap.isNativePlatform()) {
    return { success: false, error: 'Not running in native Capacitor app' }
  }

  try {
    const { registerPlugin } = await import('@capacitor/core')

    const ThermalPrinter = registerPlugin<{
      printReceipt(opts: PrintReceiptOptions): Promise<PrintResult>
    }>('ThermalPrinter')

    return await ThermalPrinter.printReceipt({
      connectionType: 'usb',
      paperWidth: 80,
      ...options,
    })
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Plugin call failed' }
  }
}
