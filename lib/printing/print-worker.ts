/**
 * print-worker.ts
 *
 * Self-contained background print worker for the Android POS tablet.
 *
 * Architecture:
 *   iPhone  →  Supabase print_jobs  →  Android Worker  →  TCP 192.168.1.127:9100
 *
 * Safe to import on all platforms — self-guards with isNativeAndroid().
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { nativePrintReceipt, isNativeAndroid } from './thermal-plugin'

// ─── Singleton guard ────────────────────────────────────────────────────────────
let workerStarted = false

// ─── In-memory lock: prevent double-processing on this device ──────────────────
const processingJobs = new Set<string>()

// ─── Config ─────────────────────────────────────────────────────────────────────
const PRINTER_IP     = '192.168.1.127'
const PRINTER_PORT   = 9100
const MAX_RETRIES    = 3
const RETRY_DELAYS   = [5000, 15000, 30000]
const HEARTBEAT_MS   = 15_000
const DEVICE_ID      = `android-pos-${typeof window !== 'undefined' ? (window as any).__capacitorDeviceId || 'main' : 'ssr'}`

// ─── Status callback for React UI ──────────────────────────────────────────────
type WorkerStatus = 'online' | 'error'
type StatusCallback = (status: WorkerStatus, message?: string) => void
let _onStatusChange: StatusCallback = () => {}

export function setPrintWorkerStatusCallback(cb: StatusCallback) {
  _onStatusChange = cb
}

// ─── Logger ─────────────────────────────────────────────────────────────────────
function log(msg: string) {
  const ts = new Date().toISOString()
  console.log(`[PrintWorker ${ts}] ${msg}`)
}
function err(msg: string, detail?: any) {
  const ts = new Date().toISOString()
  console.error(`[PrintWorker ${ts}] ❌ ${msg}`, detail ?? '')
}

// ─── Update print job status via Supabase client directly ──────────────────────
async function setJobStatus(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  extra: Record<string, any> = {}
) {
  const { error } = await supabase
    .from('print_jobs')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', jobId)
  if (error) err(`setJobStatus(${status}) failed for ${jobId}:`, error.message)
}

// ─── Atomically claim a job — only succeeds if still 'pending' ─────────────────
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
    log(`Job ${jobId} already claimed — skipping`)
    return false
  }
  return true
}

// ─── Process one job with retry logic ──────────────────────────────────────────
async function processJob(supabase: ReturnType<typeof createClient>, job: any) {
  const jobId = job.id

  if (processingJobs.has(jobId)) {
    log(`Job ${jobId} already in-flight on this device — skipping`)
    return
  }
  processingJobs.add(jobId)
  log(`JOB RECEIVED: ${jobId}`)

  try {
    const claimed = await claimJob(supabase, jobId)
    if (!claimed) { processingJobs.delete(jobId); return }

    log(`🔒 JOB CLAIMED: ${jobId}`)

    let lastError = ''
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] ?? 30000
        log(`🔄 Retry ${attempt}/${MAX_RETRIES} for ${jobId} in ${delay / 1000}s`)
        await new Promise(r => setTimeout(r, delay))
      }

      try {
        log(`🔌 CONNECTING TO PRINTER ${PRINTER_IP}:${PRINTER_PORT} (attempt ${attempt + 1})`)
        log(`JOB PROCESSING: ${jobId}`)

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
          log(`JOB COMPLETED: ${jobId}`)
          await setJobStatus(supabase, jobId, 'completed')
          processingJobs.delete(jobId)
          return
        }

        lastError = result.error ?? 'Unknown printer error'
        err(`Print failed (attempt ${attempt + 1}): ${lastError}`)
      } catch (e: any) {
        lastError = e?.message ?? 'TCP exception'
        err(`Exception (attempt ${attempt + 1}):`, lastError)
      }
    }

    err(`Job ${jobId} exhausted retries. Final error: ${lastError}`)
    await setJobStatus(supabase, jobId, 'failed', {
      error_message: lastError,
      retry_count: MAX_RETRIES,
      last_attempt: new Date().toISOString(),
    })
  } finally {
    processingJobs.delete(jobId)
  }
}

// ─── Drain all pending jobs on startup ─────────────────────────────────────────
async function drainPendingJobs(supabase: ReturnType<typeof createClient>) {
  log('🔍 Draining pending jobs...')
  try {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      err('Failed to fetch pending jobs:', error.message)
      _onStatusChange('error', `DB error: ${error.message}`)
      return
    }

    if (data && data.length > 0) {
      log(`📋 Found ${data.length} pending job(s) — processing now`)
      for (const job of data) {
        await processJob(supabase, job)
      }
    } else {
      log('✓ No pending jobs found')
    }
  } catch (e: any) {
    err('drainPendingJobs error:', e.message)
    _onStatusChange('error', e.message)
  }
}

// ─── Heartbeat: write device presence every 15 seconds ─────────────────────────
let triggerHeartbeatCallback: () => Promise<void> = async () => {}

export async function forceHeartbeat() {
  await triggerHeartbeatCallback()
}

function startHeartbeat(supabase: ReturnType<typeof createClient>): () => void {
  let printerConnected = false

  log('HEARTBEAT SERVICE STARTED')

  const ping = async () => {
    log('SENDING HEARTBEAT')
    try {
      printerConnected = !processingJobs.size ? printerConnected : true
    } catch {}

    const payload = {
      device_id:         DEVICE_ID,
      device_name:       'Android POS',
      last_seen:         new Date().toISOString(),
      printer_ip:        PRINTER_IP,
      printer_port:      PRINTER_PORT,
      printer_connected: printerConnected,
      wifi_connected:    typeof navigator !== 'undefined' ? navigator.onLine : true,
      app_version:       '1.0.0',
    }

    try {
      const { error } = await supabase
        .from('pos_heartbeat')
        .upsert(payload, { onConflict: 'device_id' })

      if (error) {
        if (error.code === '42P01') {
          err('UPSERT ERROR: pos_heartbeat table not created yet')
        } else {
          err(`UPSERT ERROR: ${error.message} (Code: ${error.code})`)
        }
        log('HEARTBEAT FAILED')
      } else {
        log(`UPSERT SUCCESS`)
        log('HEARTBEAT SUCCESS')
        printerConnected = true // Mark as connected once heartbeat succeeds
      }
    } catch (e: any) {
      err(`UPSERT ERROR (Exception): ${e.message}`)
      log('HEARTBEAT FAILED')
    }
  }

  triggerHeartbeatCallback = ping

  log('HEARTBEAT TIMER STARTED')
  ping() // immediate first ping on startup

  const interval = setInterval(ping, HEARTBEAT_MS)

  // Listen to visibility changes (app goes to background / foreground)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      log('APP RESUMED - SENDING HEARTBEAT IMMEDIATE')
      ping()
    } else {
      log('APP BACKGROUNDED')
    }
  }
  
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  return () => {
    clearInterval(interval)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }
}

// ─── Main entry point ──────────────────────────────────────────────────────────
export function startPrintWorker(): () => void {
  if (!isNativeAndroid()) {
    log('Not on Android native — worker not started (isNativeAndroid=false)')
    return () => {}
  }

  if (workerStarted) {
    log('Worker already running — ignoring duplicate start')
    return () => {}
  }
  workerStarted = true

  console.log('') // blank line for visibility
  console.log('╔══════════════════════════════════════╗')
  console.log('║  🟢 PRINT SERVER ACTIVE               ║')
  console.log(`║  APP STARTED                          ║`)
  console.log(`║  WORKER STARTED                       ║`)
  console.log('╚══════════════════════════════════════╝')
  console.log('')

  _onStatusChange('online')

  const supabase = createClient()

  // 1. Connect to Supabase
  log('SUPABASE CONNECTED — initializing worker')

  // 2. Drain missed jobs first
  drainPendingJobs(supabase)

  // 3. Start heartbeat (15s interval)
  const stopHeartbeat = startHeartbeat(supabase)

  // 4. Subscribe Realtime — NO column filter on INSERT (unreliable in Supabase)
  //    Filter is applied in-code: job.status === 'pending'
  log('REALTIME SUBSCRIBED')
  const channel = supabase
    .channel('pos-print-worker-v2')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_jobs' },
      async (payload: any) => {
        const job = payload.new
        log(`📡 REALTIME INSERT: job ${job.id}, status=${job.status}`)
        if (job.status === 'pending') {
          await processJob(supabase, job)
        }
      }
    )
    .subscribe()

  return () => {
    log('🛑 Stopping print worker')
    workerStarted = false
    supabase.removeChannel(channel)
    stopHeartbeat()
  }
}

// ─── Export for diagnostics page ────────────────────────────────────────────────
export function getWorkerStatus() {
  return {
    started: workerStarted,
    isAndroid: isNativeAndroid(),
    processingJobs: processingJobs.size,
    deviceId: DEVICE_ID,
  }
}
