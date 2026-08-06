/**
 * print-bridge.ts
 *
 * Single entry point for ALL printing across all platforms.
 *
 * Routing:
 *   Android Capacitor APK  →  TCP → 192.168.1.127:9100  (native plugin)
 *   iPhone Safari PWA      →  Supabase relay → Android worker → printer
 *   Desktop browser        →  Supabase relay → Android worker → printer
 *
 * window.print() is NEVER called.
 * Browser print dialog is NEVER opened.
 * AirPrint is NEVER used.
 * Direct TCP from browser is NEVER attempted.
 */

'use client'

import { toast } from 'sonner'
import { isNativeAndroid, nativePrintReceipt, isPOSWorkerMode } from './thermal-plugin'
import { createPrintJob } from '@/lib/actions/print.actions'
import { createClient } from '@/lib/supabase/client'

const PRINTER_IP  = '192.168.1.127'
const PRINTER_PORT = 9100

// iPhone waits up to 30s. If Android goes offline mid-wait, we detect it via heartbeat check.
const RELAY_TIMEOUT_MS = 30_000
// Heartbeat older than this = POS is offline
const HEARTBEAT_STALE_MS = 60_000

// ─── iOS PWA detection ────────────────────────────────────────────────────────
export function isIOSPWA(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  return isIOS && isStandalone
}

export function isBrowserClient(): boolean {
  return !isNativeAndroid() && !isPOSWorkerMode()
}

// ─── Heartbeat check ──────────────────────────────────────────────────────────
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
      // PGRST116 = no rows; 42P01 = table doesn't exist
      if (error.code === 'PGRST116') {
        return { online: false, reason: 'No heartbeat received — Android POS has never connected', lastSeen: null, printerConnected: false, wifiConnected: false, deviceName: null }
      }
      if (error.code === '42P01') {
        // Table doesn't exist yet — assume online so we don't block
        return { online: true, reason: 'Heartbeat table not set up yet — proceeding', lastSeen: null, printerConnected: true, wifiConnected: true, deviceName: null }
      }
      return { online: false, reason: `Database error: ${error.message}`, lastSeen: null, printerConnected: false, wifiConnected: false, deviceName: null }
    }

    if (!data) {
      return { online: false, reason: 'No heartbeat received — open the Android POS app', lastSeen: null, printerConnected: false, wifiConnected: false, deviceName: null }
    }

    const ageMs = Date.now() - new Date(data.last_seen).getTime()
    const ageSec = Math.round(ageMs / 1000)

    if (!data.wifi_connected) {
      return { online: false, reason: 'Android POS WiFi is disconnected', lastSeen: data.last_seen, printerConnected: data.printer_connected, wifiConnected: false, deviceName: data.device_name }
    }

    if (ageMs > HEARTBEAT_STALE_MS) {
      return { online: false, reason: `Restaurant printer is offline. (Last seen ${ageSec}s ago — is the Android POS tablet open?)`, lastSeen: data.last_seen, printerConnected: data.printer_connected, wifiConnected: data.wifi_connected, deviceName: data.device_name }
    }

    return { online: true, reason: `Online — last heartbeat ${ageSec}s ago`, lastSeen: data.last_seen, printerConnected: data.printer_connected, wifiConnected: data.wifi_connected, deviceName: data.device_name }
  } catch (e: any) {
    // Network error — don't block printing, assume online
    console.warn('[print-bridge] Heartbeat check failed:', e?.message)
    return { online: true, reason: 'Heartbeat check failed — proceeding anyway', lastSeen: null, printerConnected: true, wifiConnected: true, deviceName: null }
  }
}

// ─── Main print function ──────────────────────────────────────────────────────
export async function printReceipt(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0,
  paperWidth: 58 | 80 = 80
): Promise<void> {
  if (!order) {
    toast.error('No order data to print.')
    return
  }

  // ── Path 1: Android Capacitor native APK ─────────────────────────────────────
  // Direct TCP print via ThermalPrinterPlugin. No browser dialogs. Ever.
  if (isNativeAndroid()) {
    toast.loading('Sending to printer...', { id: 'print-toast' })
    console.log(`[print-bridge] Path 1: Android native → TCP ${PRINTER_IP}:${PRINTER_PORT}`)
    const result = await nativePrintReceipt({ order, paymentMethod, taxRate, serviceChargeRate, paperWidth, printerIp: PRINTER_IP, printerPort: PRINTER_PORT })
    if (result.success) {
      toast.success('Receipt printed!', { id: 'print-toast' })
    } else {
      toast.error(`Printer error: ${result.error ?? 'Unknown'}`, { id: 'print-toast' })
    }
    return
  }

  // ── Path 2: iPhone PWA / Any browser → Supabase relay ────────────────────────
  // window.print() is NEVER called here. EVER.
  const platform = isIOSPWA() ? 'iPhone PWA' : 'Browser'
  console.log(`[print-bridge] Path 2: ${platform} → Supabase relay`)

  toast.loading('Sending receipt to kitchen printer...', { id: 'print-toast' })

  try {
    // Fast heartbeat check — fail immediately if POS is offline
    console.log('[print-bridge] Checking Android POS heartbeat...')
    const diag = await getPrintServerDiagnostics()
    console.log('[print-bridge] POS diagnostics:', diag)

    if (!diag.online) {
      toast.error(diag.reason, { id: 'print-toast', duration: 7000 })
      return
    }

    // Create the print job
    console.log('[print-bridge] Job created — inserting into print_jobs...')
    const res = await createPrintJob(order, paymentMethod, taxRate, serviceChargeRate, paperWidth)
    if (res.error || !res.data) {
      throw new Error(res.error ?? 'Failed to create print job')
    }

    const jobId = res.data.id
    console.log(`[print-bridge] Job created: ${jobId} — waiting for Android worker...`)
    toast.loading('Printing...', { id: 'print-toast' })

    // Subscribe to status updates from the Android worker
    const result = await waitForJobCompletion(jobId)

    if (result.success) {
      toast.success('Receipt printed successfully.', { id: 'print-toast', duration: 4000 })
    } else {
      toast.error(result.reason, { id: 'print-toast', duration: 8000 })
    }
  } catch (e: any) {
    console.error('[print-bridge] Relay error:', e)
    toast.error(`Print error: ${e?.message ?? 'Unknown error'}`, { id: 'print-toast' })
  }
}

// ─── Wait for Android worker to update the job status ─────────────────────────
function waitForJobCompletion(jobId: string): Promise<{ success: boolean; reason: string }> {
  return new Promise((resolve) => {
    const supabase = createClient()
    let settled = false
    let heartbeatCheckInterval: ReturnType<typeof setInterval> | null = null

    const finish = (result: { success: boolean; reason: string }) => {
      if (settled) return
      settled = true
      if (heartbeatCheckInterval) clearInterval(heartbeatCheckInterval)
      supabase.removeChannel(channel)
      resolve(result)
    }

    // Timeout after 30 seconds — but first check if POS went offline
    const timer = setTimeout(() => {
      finish({ success: false, reason: 'Kitchen POS tablet is offline. Please try again.' })
    }, RELAY_TIMEOUT_MS)

    // Every 10s while waiting, re-check if the POS is still online
    heartbeatCheckInterval = setInterval(async () => {
      const diag = await getPrintServerDiagnostics()
      if (!diag.online) {
        clearTimeout(timer)
        finish({ success: false, reason: diag.reason })
      }
    }, 10_000)

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
            finish({ success: true, reason: 'completed' })
          } else if (status === 'failed') {
            clearTimeout(timer)
            finish({ success: false, reason: payload.new?.error_message ?? 'Printer error — please try again' })
          }
        }
      )
      .subscribe()
  })
}

export { isNativeAndroid, isPOSWorkerMode }
