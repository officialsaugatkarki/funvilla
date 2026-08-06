/**
 * print-worker.ts
 *
 * Permanent background print worker for the Android POS tablet.
 *
 * Architecture:
 *   iPhone PWA  →  Supabase print_jobs  →  This worker  →  TCP 192.168.1.127:9100
 *
 * SINGLETON DESIGN:
 *   State is stored on window.__posWorker so it survives Next.js HMR module
 *   reloads, React re-renders, and page navigations. The interval and
 *   Supabase channel are created exactly ONCE per browser session.
 *
 * ACTIVATION:
 *   Works when isNativeAndroid() = true (Capacitor APK)
 *   OR when isPOSWorkerMode() = true (browser-based POS with localStorage flag)
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { nativePrintReceipt, isPOSWorkerMode, isNativeAndroid } from './thermal-plugin'

// ─── Window-level singleton state ─────────────────────────────────────────────
// Using window avoids module-level variables being reset by Next.js HMR.

interface POSWorkerState {
  started: boolean
  heartbeatInterval: ReturnType<typeof setInterval> | null
  supabaseChannel: any
  processingJobs: Set<string>
  statusCallback: (status: 'online' | 'error', msg?: string) => void
  supabase: ReturnType<typeof createClient> | null
}

function getState(): POSWorkerState {
  if (typeof window === 'undefined') {
    return {
      started: false, heartbeatInterval: null,
      supabaseChannel: null, processingJobs: new Set(),
      statusCallback: () => {}, supabase: null,
    }
  }
  const w = window as any
  if (!w.__posWorker) {
    w.__posWorker = {
      started: false,
      heartbeatInterval: null,
      supabaseChannel: null,
      processingJobs: new Set<string>(),
      statusCallback: () => {},
      supabase: null,
    } as POSWorkerState
  }
  return w.__posWorker as POSWorkerState
}

// ─── Config ─────────────────────────────────────────────────────────────────────
const PRINTER_IP   = '192.168.1.127'
const PRINTER_PORT = 9100
const MAX_RETRIES  = 3
const RETRY_DELAYS = [5000, 15000, 30000]
const HEARTBEAT_MS = 15_000

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr'
  const key = 'pos_device_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = `android-pos-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    localStorage.setItem(key, id)
  }
  return id
}

// ─── Logging ─────────────────────────────────────────────────────────────────────
function log(msg: string, data?: any) {
  const ts = new Date().toISOString()
  if (data !== undefined) {
    console.log(`[HEARTBEAT ${ts}] ${msg}`, data)
  } else {
    console.log(`[HEARTBEAT ${ts}] ${msg}`)
  }
}
function logError(msg: string, data?: any) {
  const ts = new Date().toISOString()
  console.error(`[HEARTBEAT ${ts}] ❌ ${msg}`, data ?? '')
}

// ─── Public API for status callback ───────────────────────────────────────────
export function setPrintWorkerStatusCallback(
  cb: (status: 'online' | 'error', msg?: string) => void
) {
  const state = getState()
  state.statusCallback = cb
}

// ─── Export for diagnostics ───────────────────────────────────────────────────
export function getWorkerStatus() {
  const state = getState()
  return {
    started: state.started,
    isAndroid: isNativeAndroid(),
    isPOSMode: isPOSWorkerMode(),
    processingJobs: state.processingJobs.size,
    deviceId: typeof window !== 'undefined' ? getDeviceId() : 'ssr',
  }
}

// ─── Manual heartbeat trigger (for diagnostics test button) ──────────────────
export async function forceHeartbeat() {
  const state = getState()
  if (!state.supabase) {
    state.supabase = createClient()
  }
  await sendHeartbeat(state.supabase)
}

// ─── Heartbeat ───────────────────────────────────────────────────────────────
async function sendHeartbeat(supabase: ReturnType<typeof createClient>) {
  const deviceId = getDeviceId()
  const payload = {
    device_id:         deviceId,
    device_name:       'Android POS',
    last_seen:         new Date().toISOString(),
    printer_ip:        PRINTER_IP,
    printer_port:      PRINTER_PORT,
    printer_connected: true,
    wifi_connected:    typeof navigator !== 'undefined' ? navigator.onLine : true,
    app_version:       '1.0.0',
  }

  log('SENDING HEARTBEAT', { device_id: deviceId, last_seen: payload.last_seen })

  try {
    const { data, error } = await supabase
      .from('pos_heartbeat')
      .upsert(payload, { onConflict: 'device_id' })
      .select()

    log('Heartbeat result', { data, error })

    if (error) {
      if (error.code === '42P01') {
        logError('HEARTBEAT FAILED: pos_heartbeat table does not exist — run SQL migration')
      } else {
        logError(`UPSERT ERROR: ${error.message} (code: ${error.code})`)
      }
    } else {
      log('UPSERT SUCCESS — HEARTBEAT SUCCESS')
      const state = getState()
      state.statusCallback('online')
    }
  } catch (e: any) {
    logError('HEARTBEAT FAILED (exception)', e?.stack ?? e?.message)
  }
}

function startHeartbeatTimer(supabase: ReturnType<typeof createClient>) {
  const state = getState()

  // Clear any existing interval — safety guard against double-start
  if (state.heartbeatInterval !== null) {
    clearInterval(state.heartbeatInterval)
    state.heartbeatInterval = null
    log('Cleared existing heartbeat interval before restart')
  }

  log('HEARTBEAT SERVICE STARTED')

  // Immediate first ping
  sendHeartbeat(supabase)

  log('HEARTBEAT TIMER STARTED — interval: 15s')
  state.heartbeatInterval = setInterval(() => {
    sendHeartbeat(supabase)
  }, HEARTBEAT_MS)

  // Re-send immediately when app comes back to foreground
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      log('APP RESUMED — sending immediate heartbeat')
      sendHeartbeat(supabase)
    }
  }
  document.removeEventListener('visibilitychange', handleVisibility)
  document.addEventListener('visibilitychange', handleVisibility)

  // Re-send on network reconnect
  const handleOnline = () => {
    log('NETWORK RECONNECTED — sending heartbeat')
    sendHeartbeat(supabase)
  }
  window.removeEventListener('online', handleOnline)
  window.addEventListener('online', handleOnline)
}

// ─── Job processing ───────────────────────────────────────────────────────────
async function setJobStatus(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  extra: Record<string, any> = {}
) {
  const { error } = await supabase
    .from('print_jobs')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', jobId)
  if (error) logError(`setJobStatus(${status}) failed for ${jobId}:`, error.message)
}

async function claimJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('print_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'pending')
    .select('id')
    .single()

  if (error || !data) {
    log(`Job ${jobId} already claimed by another device — skipping`)
    return false
  }
  return true
}

async function processJob(supabase: ReturnType<typeof createClient>, job: any) {
  const state = getState()
  const jobId = job.id

  if (state.processingJobs.has(jobId)) {
    log(`JOB RECEIVED: ${jobId} — already in-flight, skipping`)
    return
  }

  state.processingJobs.add(jobId)
  log(`JOB RECEIVED: ${jobId}`)

  try {
    const claimed = await claimJob(supabase, jobId)
    if (!claimed) {
      state.processingJobs.delete(jobId)
      return
    }

    log(`PRINTING STARTED: ${jobId} → ${PRINTER_IP}:${PRINTER_PORT}`)

    let lastError = ''
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] ?? 30000
        log(`Retry ${attempt}/${MAX_RETRIES} for job ${jobId} in ${delay / 1000}s`)
        await new Promise(r => setTimeout(r, delay))
      }

      try {
        const result = await nativePrintReceipt({
          order:             job.order_data,
          paymentMethod:     job.payment_method,
          taxRate:           Number(job.tax_rate),
          serviceChargeRate: Number(job.service_charge_rate ?? 0),
          paperWidth:        job.paper_width ?? 80,
          printerIp:         PRINTER_IP,
          printerPort:       PRINTER_PORT,
        })

        if (result.success) {
          log(`PRINTING FINISHED: ${jobId}`)
          await setJobStatus(supabase, jobId, 'completed')
          return
        }

        lastError = result.error ?? 'Unknown printer error'
        logError(`Print attempt ${attempt + 1} failed: ${lastError}`)
      } catch (e: any) {
        lastError = e?.message ?? 'TCP exception'
        logError(`Print exception (attempt ${attempt + 1}):`, e?.stack ?? lastError)
      }
    }

    logError(`PRINTING FAILED: ${jobId} — exhausted ${MAX_RETRIES} retries. Last error: ${lastError}`)
    await setJobStatus(supabase, jobId, 'failed', {
      error_message: lastError,
      retry_count: MAX_RETRIES,
      last_attempt: new Date().toISOString(),
    })
  } finally {
    state.processingJobs.delete(jobId)
  }
}

async function drainPendingJobs(supabase: ReturnType<typeof createClient>) {
  log('Checking for pending jobs on startup...')
  try {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      logError('Failed to fetch pending jobs:', error.message)
      return
    }

    if (data && data.length > 0) {
      log(`Found ${data.length} pending job(s) — processing now`)
      for (const job of data) {
        await processJob(supabase, job)
      }
    } else {
      log('No pending jobs found on startup')
    }
  } catch (e: any) {
    logError('drainPendingJobs error:', e?.message)
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export function startPrintWorker(): () => void {
  const state = getState()

  if (!isPOSWorkerMode()) {
    // Not a POS device — log what we detected for debugging
    const cap = typeof window !== 'undefined' ? (window as any).Capacitor : null
    log(
      `Not in POS mode — isNativeAndroid=${isNativeAndroid()}, ` +
      `capacitorPresent=${!!cap}, platform=${cap?.getPlatform?.() ?? 'none'}, ` +
      `localStorage_pos_mode=${typeof window !== 'undefined' ? localStorage.getItem('pos_worker_mode') : 'n/a'}`
    )
    return () => {}
  }

  if (state.started) {
    log('WORKER ALREADY RUNNING — skipping duplicate start')
    // Re-wire status callback in case it was lost during re-render
    state.statusCallback('online')
    return () => {}
  }

  state.started = true

  console.log('')
  console.log('╔════════════════════════════════════╗')
  console.log('║  🟢 POS PRINT SERVER ACTIVE         ║')
  console.log('║  APP STARTED — WORKER STARTED       ║')
  console.log('╚════════════════════════════════════╝')
  console.log('')

  state.statusCallback('online')

  const supabase = createClient()
  state.supabase = supabase

  log('SUPABASE CONNECTED')

  // 1. Send first heartbeat + start timer
  startHeartbeatTimer(supabase)

  // 2. Drain any jobs missed before the app started
  drainPendingJobs(supabase)

  // 3. Subscribe to Realtime for live jobs — NO column filter (unreliable on INSERT)
  log('REALTIME SUBSCRIBED — listening for print_jobs INSERT')
  state.supabaseChannel = supabase
    .channel('pos-print-worker-v3')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_jobs' },
      async (payload: any) => {
        const job = payload.new
        log(`REALTIME: INSERT received — job ${job.id}, status=${job.status}`)
        if (job.status === 'pending') {
          await processJob(supabase, job)
        }
      }
    )
    .subscribe()

  // No cleanup needed — this runs for the entire app session.
  // Returning a no-op so React useEffect doesn't kill the interval on unmount.
  return () => {
    log('Cleanup called — worker remains alive (singleton)')
  }
}
