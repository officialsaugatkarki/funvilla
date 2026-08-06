/**
 * print-worker.ts
 *
 * Self-contained background print worker for the Android POS tablet.
 *
 * Architecture:
 *   iPhone  →  Supabase print_jobs table  →  Android POS Worker  →  TCP 192.168.1.127:9100
 *
 * This module is ONLY activated on the Android Capacitor native platform.
 * It is safe to import on any platform — it self-guards with isNativeAndroid().
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { nativePrintReceipt, isNativeAndroid } from './thermal-plugin'

// ─── Singleton guard — only one worker per app session ────────────────────────
let workerStarted = false

// ─── In-memory lock to prevent duplicate prints ───────────────────────────────
const processingJobs = new Set<string>()

// ─── Config ────────────────────────────────────────────────────────────────────
const PRINTER_IP   = '192.168.1.127'
const PRINTER_PORT = 9100
const MAX_RETRIES  = 3
const RETRY_DELAYS = [5000, 15000, 30000] // ms

// ─── Status callback ───────────────────────────────────────────────────────────
type StatusCallback = (status: 'online' | 'error', message?: string) => void
let onStatusChange: StatusCallback = () => {}

export function setPrintWorkerStatusCallback(cb: StatusCallback) {
  onStatusChange = cb
}

// ─── Logger ────────────────────────────────────────────────────────────────────
function log(msg: string, ...args: any[]) {
  console.log(`[PrintWorker] ${msg}`, ...args)
}
function logError(msg: string, ...args: any[]) {
  console.error(`[PrintWorker] ❌ ${msg}`, ...args)
}

// ─── Update job status directly via Supabase client (no server action) ─────────
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
  if (error) logError(`Failed to set job ${jobId} status → ${status}:`, error.message)
}

// ─── Claim a job atomically: only claim if still pending ─────────────────────
async function claimJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string
): Promise<boolean> {
  // Update only if status is still 'pending' — this is our atomic claim
  const { data, error } = await supabase
    .from('print_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('status', 'pending')  // ← Only succeeds if it's still pending
    .select('id')
    .single()

  if (error || !data) {
    log(`Job ${jobId} already claimed by another device — skipping`)
    return false
  }
  return true
}

// ─── Core: process a single print job with retries ────────────────────────────
async function processJob(supabase: ReturnType<typeof createClient>, job: any) {
  const jobId = job.id

  // Deduplicate within this device session
  if (processingJobs.has(jobId)) {
    log(`Job ${jobId} already processing on this device — skipping`)
    return
  }
  processingJobs.add(jobId)

  try {
    log(`📥 Job received: ${jobId}`)

    // Claim atomically (prevents other Android devices from duplicating)
    const claimed = await claimJob(supabase, jobId)
    if (!claimed) {
      processingJobs.delete(jobId)
      return
    }

    let lastError = ''
    let attempt = 0

    while (attempt <= MAX_RETRIES) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] ?? 30000
        log(`🔄 Retry ${attempt}/${MAX_RETRIES} for job ${jobId} in ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
      }

      try {
        log(`🔌 Connecting to printer ${PRINTER_IP}:${PRINTER_PORT} (attempt ${attempt + 1})...`)

        const result = await nativePrintReceipt({
          order:             job.order_data,
          paymentMethod:     job.payment_method,
          taxRate:           job.tax_rate,
          serviceChargeRate: job.service_charge_rate ?? 0,
          paperWidth:        job.paper_width ?? 80,
          printerIp:         PRINTER_IP,
          printerPort:       PRINTER_PORT,
        })

        if (result.success) {
          log(`✅ Job ${jobId} completed successfully`)
          await setJobStatus(supabase, jobId, 'completed')
          processingJobs.delete(jobId)
          return
        } else {
          lastError = result.error ?? 'Unknown printer error'
          logError(`Job ${jobId} print failed: ${lastError}`)
        }
      } catch (err: any) {
        lastError = err?.message ?? 'TCP connection exception'
        logError(`Job ${jobId} exception (attempt ${attempt + 1}):`, lastError)
      }

      attempt++
    }

    // All retries exhausted
    logError(`Job ${jobId} failed after ${MAX_RETRIES} retries. Last error: ${lastError}`)
    await setJobStatus(supabase, jobId, 'failed', {
      error_message: lastError,
      retry_count: MAX_RETRIES,
      last_attempt: new Date().toISOString(),
    })
  } finally {
    processingJobs.delete(jobId)
  }
}

// ─── Fetch and drain all pending jobs on startup ──────────────────────────────
async function drainPendingJobs(supabase: ReturnType<typeof createClient>) {
  log('🔍 Checking for missed pending jobs...')
  try {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      logError('Failed to fetch pending jobs:', error.message)
      onStatusChange('error', error.message)
      return
    }

    if (data && data.length > 0) {
      log(`📋 Found ${data.length} pending job(s) on startup — processing...`)
      for (const job of data) {
        await processJob(supabase, job)
      }
    } else {
      log('✓ No pending jobs found on startup')
    }
  } catch (err: any) {
    logError('drainPendingJobs error:', err.message)
    onStatusChange('error', err.message)
  }
}

// ─── Heartbeat: write device info every 30 seconds ───────────────────────────
function startHeartbeat(supabase: ReturnType<typeof createClient>) {
  const deviceName = `Android-POS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  const ping = async () => {
    try {
      await supabase
        .from('pos_heartbeat')
        .upsert({
          device_id:         deviceName,
          device_name:       deviceName,
          last_seen:         new Date().toISOString(),
          printer_ip:        PRINTER_IP,
          printer_port:      PRINTER_PORT,
          printer_connected: true,
          wifi_connected:    typeof navigator !== 'undefined' ? navigator.onLine : true,
          app_version:       '1.0.0',
        }, { onConflict: 'device_id' })
    } catch (err: any) {
      // Non-fatal — heartbeat is optional
      log('Heartbeat skipped (table may not exist yet):', err?.message)
    }
  }

  ping() // immediate
  const interval = setInterval(ping, 30_000)
  return () => clearInterval(interval)
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export function startPrintWorker(): () => void {
  if (!isNativeAndroid()) {
    log('Not on Android native — worker not started')
    return () => {}
  }

  if (workerStarted) {
    log('Worker already running — skipping duplicate start')
    return () => {}
  }
  workerStarted = true

  log('🟢 Print Server Active — starting worker...')
  onStatusChange('online')

  const supabase = createClient()

  // 1. Drain any pending jobs from before the app launched
  drainPendingJobs(supabase)

  // 2. Start heartbeat
  const stopHeartbeat = startHeartbeat(supabase)

  // 3. Subscribe to Realtime — listen for ALL inserts to print_jobs
  //    We do NOT filter by status here because Supabase Realtime filters
  //    on INSERT are unreliable. We filter in-code instead.
  const channel = supabase
    .channel('pos-print-worker', { config: { broadcast: { ack: false } } })
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_jobs' },
      async (payload: any) => {
        const job = payload.new
        log(`📡 Realtime INSERT received: job ${job.id}, status=${job.status}`)
        if (job.status === 'pending') {
          await processJob(supabase, job)
        }
      }
    )
    .subscribe()

  log('📡 Subscribed to Supabase Realtime print_jobs')

  // Cleanup function
  return () => {
    log('🛑 Stopping print worker...')
    workerStarted = false
    supabase.removeChannel(channel)
    stopHeartbeat()
  }
}
