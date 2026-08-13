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
 * Browser print dialogs are NEVER opened.
 */

'use client'

import { toast } from 'sonner'
import { isNativeAndroid, nativePrintReceipt, isPOSWorkerMode } from './thermal-plugin'
import { createPrintJob } from '@/lib/actions/print.actions'
import { createClient } from '@/lib/supabase/client'

const PRINTER_IP     = '192.168.1.127'
const PRINTER_PORT   = 9100
const RELAY_TIMEOUT  = 45_000   // 45s hard timeout
const POLL_INTERVAL  = 2_000    // Poll every 2s as fallback (Realtime can miss events)
const HEARTBEAT_STALE = 60_000  // 60s = POS is offline

function plog(msg: string, data?: any) {
  const ts = new Date().toISOString()
  data !== undefined
    ? console.log(`[iPhone→Printer ${ts}] ${msg}`, data)
    : console.log(`[iPhone→Printer ${ts}] ${msg}`)
}

// ─── iOS PWA detection ────────────────────────────────────────────────────────
export function isIOSPWA(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
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

// ─── Main print function ──────────────────────────────────────────────────────
export async function printReceipt(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0,
  paperWidth: 58 | 80 = 80
): Promise<void> {
  if (!order) { toast.error('No order data to print.'); return }

  // ── Path 1: Android Capacitor APK — direct native plugin ───────────────────────────────
  if (isNativeAndroid()) {
    toast.loading('Sending to printer...', { id: 'print-toast' })
    
    // Load config from localStorage (set via Settings -> Printer)
    let connectionType: 'usb' | 'network' = 'usb'
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

    plog(`PATH 1: Android native APK → ${connectionType.toUpperCase()}`)
    const result = await nativePrintReceipt({ 
      order, 
      paymentMethod, 
      taxRate, 
      serviceChargeRate, 
      paperWidth: configPaperWidth, 
      connectionType,
      printerIp, 
      printerPort 
    })
    plog('PATH 1 result:', result)
    if (result.success) {
      toast.success('Receipt printed!', { id: 'print-toast' })
    } else {
      toast.error(`Printer error: ${result.error ?? 'Unknown'}`, { id: 'print-toast' })
    }
    return
  }

  // ── Path 2: iPhone PWA / browser → Supabase relay ────────────────────────────
  const platform = isIOSPWA() ? 'iPhone PWA (standalone)' : 'Browser'
  plog(`PATH 2: ${platform} → Supabase relay`)

  toast.loading('Sending receipt to kitchen printer...', { id: 'print-toast' })

  try {
    // 1. Check heartbeat
    plog('STEP 1: Checking Android POS heartbeat...')
    const diag = await getPrintServerDiagnostics()
    plog('STEP 1 result:', diag)

    if (!diag.online) {
      plog(`STEP 1 FAILED: POS offline — ${diag.reason}`)
      toast.error(diag.reason, { id: 'print-toast', duration: 7000 })
      return
    }
    plog('STEP 1 OK: POS is online')

    // 2. Insert print job
    plog('STEP 2: Creating print_jobs row in Supabase...')
    const res = await createPrintJob(order, paymentMethod, taxRate, serviceChargeRate, paperWidth)
    if (res.error || !res.data) {
      plog('STEP 2 FAILED:', res.error)
      throw new Error(res.error ?? 'Failed to create print job')
    }
    const jobId = res.data.id
    plog(`STEP 2 OK: Job created with id=${jobId}`)

    toast.loading('Printing...', { id: 'print-toast' })
    plog(`STEP 3: Waiting for Android worker to process job ${jobId}...`)
    plog(`STEP 3: Will poll every ${POLL_INTERVAL}ms AND listen via Realtime. Timeout: ${RELAY_TIMEOUT}ms`)

    // 3. Wait for result
    const result = await waitForJobCompletion(jobId)
    plog(`STEP 3 result:`, result)

    if (result.success) {
      toast.success('Receipt printed successfully.', { id: 'print-toast', duration: 4000 })
    } else {
      toast.error(result.reason, { id: 'print-toast', duration: 8000 })
    }
  } catch (e: any) {
    plog('FATAL ERROR:', e?.message)
    console.error('[print-bridge] Relay error:', e)
    toast.error(`Print error: ${e?.message ?? 'Unknown error'}`, { id: 'print-toast' })
  }
}

// ─── Wait for job completion — Realtime + polling fallback ────────────────────
// Supabase Realtime UPDATE filters are unreliable. We use BOTH:
//   - Realtime subscription (fast path)
//   - Direct DB poll every 2s (reliable fallback)
//   - Heartbeat check every 10s (detect POS offline mid-wait)
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

    // Hard timeout — cannot wait forever
    const hardTimeout = setTimeout(() => {
      plog(`TIMEOUT: Job ${jobId} not completed within ${RELAY_TIMEOUT}ms`)
      finish({ success: false, reason: 'Timed out — the kitchen printer did not respond. Please try again.' })
    }, RELAY_TIMEOUT)

    // Poll the DB directly every 2 seconds — reliable fallback
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
        // 'pending' or 'processing' → keep waiting
      } catch (e: any) {
        plog('POLL exception:', e?.message)
      }
    }, POLL_INTERVAL)

    // Also check if POS went offline while we're waiting
    heartbeatTimer = setInterval(async () => {
      const diag = await getPrintServerDiagnostics()
      plog(`HEARTBEAT CHECK while waiting: online=${diag.online}`)
      if (!diag.online) {
        finish({ success: false, reason: `Kitchen POS went offline: ${diag.reason}` })
      }
    }, 10_000)

    // Realtime subscription as fast path (may or may not fire depending on RLS/filters)
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

export { isNativeAndroid, isPOSWorkerMode }
