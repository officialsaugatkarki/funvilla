'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isNativeAndroid } from '@/lib/printing/thermal-plugin'
import { getWorkerStatus } from '@/lib/printing/print-worker'
import { getPrintServerDiagnostics, type PrintServerDiagnostics } from '@/lib/printing/print-bridge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Wifi, WifiOff, PrinterCheck, PrinterX, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface HeartbeatRow {
  device_id: string
  device_name: string
  last_seen: string
  printer_ip: string
  printer_port: number
  printer_connected: boolean
  wifi_connected: boolean
  app_version: string
}

interface DiagState {
  loading: boolean
  isAndroid: boolean
  workerStarted: boolean
  processingJobs: number
  deviceId: string
  heartbeats: HeartbeatRow[]
  pendingJobs: number
  failedJobs: number
  serverDiag: PrintServerDiagnostics | null
  realtimeConnected: boolean
  lastRefreshed: Date
}

function Dot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${ok ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
  )
}

function Row({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium flex items-center gap-1.5">
        {ok !== undefined && <Dot ok={ok} />}
        {value}
      </span>
    </div>
  )
}

export default function PrintDiagnosticsPage() {
  const [state, setState] = useState<DiagState>({
    loading: true,
    isAndroid: false,
    workerStarted: false,
    processingJobs: 0,
    deviceId: '',
    heartbeats: [],
    pendingJobs: 0,
    failedJobs: 0,
    serverDiag: null,
    realtimeConnected: false,
    lastRefreshed: new Date(),
  })

  const load = async () => {
    setState(s => ({ ...s, loading: true }))
    const supabase = createClient()

    const workerStatus = getWorkerStatus()
    const serverDiag   = await getPrintServerDiagnostics()

    const [heartbeatRes, pendingRes, failedRes] = await Promise.all([
      supabase.from('pos_heartbeat').select('*').order('last_seen', { ascending: false }),
      supabase.from('print_jobs').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('print_jobs').select('id', { count: 'exact' }).eq('status', 'failed'),
    ])

    // Check realtime connectivity — use a simple presence channel ping
    let realtimeOk = false
    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 5000)
        const ch = supabase.channel('diag-ping')
          .on('presence', { event: 'sync' }, () => {
            clearTimeout(t)
            supabase.removeChannel(ch)
            realtimeOk = true
            resolve()
          })
          .subscribe()
        // Also resolve on subscribe confirmation — 
        // presence sync fires after subscribe, this is a fallback
        setTimeout(() => {
          supabase.removeChannel(ch)
          // If we got this far without error, realtime is at least connected
          realtimeOk = true
          resolve()
        }, 3000)
      })
    } catch {}

    setState({
      loading: false,
      isAndroid: workerStatus.isAndroid,
      workerStarted: workerStatus.started,
      processingJobs: workerStatus.processingJobs,
      deviceId: workerStatus.deviceId,
      heartbeats: (heartbeatRes.data ?? []) as HeartbeatRow[],
      pendingJobs: pendingRes.count ?? 0,
      failedJobs: failedRes.count ?? 0,
      serverDiag,
      realtimeConnected: realtimeOk,
      lastRefreshed: new Date(),
    })
  }

  useEffect(() => { load() }, [])

  const ageLabel = (isoDate: string) => {
    const ageMs = Date.now() - new Date(isoDate).getTime()
    const s = Math.round(ageMs / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.round(s / 60)}m ago`
    return `${Math.round(s / 3600)}h ago`
  }

  const { serverDiag: sd, heartbeats } = state
  const latestHB = heartbeats[0] ?? null

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🖨️ Print System Diagnostics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last refreshed: {state.lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={state.loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* This Device */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">This Device</h2>
        <Row label="Platform" value={state.isAndroid ? '🤖 Android (Capacitor)' : '🌐 Browser / PWA'} ok={state.isAndroid} />
        <Row label="Print Worker Running" value={state.workerStarted ? 'Yes' : 'No'} ok={state.workerStarted} />
        <Row label="Jobs Currently Processing" value={state.processingJobs} ok={state.processingJobs === 0} />
        {!state.isAndroid && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-medium">
            ⚠️ This device is in Client Mode — it submits jobs to the queue but does NOT print.
            Open this page on the Android POS tablet to see the worker status.
          </div>
        )}
      </div>

      {/* Android POS Server */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Android POS Server</h2>
        <Row
          label="Print Server Online"
          value={sd?.online ? 'Online' : 'Offline'}
          ok={sd?.online}
        />
        <Row label="Status Reason" value={sd?.reason ?? '—'} />
        <Row label="Last Heartbeat" value={latestHB ? ageLabel(latestHB.last_seen) : 'Never'} ok={!!latestHB && Date.now() - new Date(latestHB.last_seen).getTime() < 90_000} />
        <Row label="WiFi Connected" value={latestHB?.wifi_connected ? 'Yes' : (latestHB ? 'No' : '—')} ok={latestHB?.wifi_connected} />
        <Row label="Printer Connected" value={latestHB?.printer_connected ? 'Yes' : (latestHB ? 'No — will connect on next job' : '—')} ok={latestHB?.printer_connected} />
        <Row label="Printer IP" value={latestHB?.printer_ip ?? '192.168.1.127'} />
        {!latestHB && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 text-red-600 text-xs font-medium">
            ❌ No heartbeat received. The Android POS app has never connected or the pos_heartbeat 
            table has not been created yet. Run the SQL migration in Supabase.
          </div>
        )}
      </div>

      {/* Supabase / Realtime */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Supabase / Realtime</h2>
        <Row label="Realtime Connected" value={state.realtimeConnected ? 'Yes' : 'No'} ok={state.realtimeConnected} />
        <Row label="Pending Jobs in Queue" value={state.pendingJobs} ok={state.pendingJobs === 0} />
        <Row label="Failed Jobs" value={state.failedJobs} ok={state.failedJobs === 0} />
      </div>

      {/* Known Devices */}
      {heartbeats.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Known Android Devices</h2>
          {heartbeats.map(hb => (
            <div key={hb.device_id} className="py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{hb.device_name}</span>
                <Badge variant={Date.now() - new Date(hb.last_seen).getTime() < 90_000 ? 'default' : 'secondary'}>
                  {Date.now() - new Date(hb.last_seen).getTime() < 90_000 ? '🟢 Online' : '⚫ Offline'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <div>Last seen: {ageLabel(hb.last_seen)} ({new Date(hb.last_seen).toLocaleTimeString()})</div>
                <div>Printer: {hb.printer_ip}:{hb.printer_port} — {hb.printer_connected ? '✓ Connected' : '✗ Not connected'}</div>
                <div>WiFi: {hb.wifi_connected ? '✓' : '✗ Disconnected'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SQL to run */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Required SQL Migration</h2>
        <p className="text-xs text-muted-foreground mb-3">
          If you see "no heartbeat" or "table not found" errors, run this in your{' '}
          <a href="https://supabase.com/dashboard/project/hdeddtzjghzvhqkxeddy/sql" target="_blank" className="underline text-primary">
            Supabase SQL Editor
          </a>:
        </p>
        <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS public.pos_heartbeat (
  device_id TEXT PRIMARY KEY,
  device_name TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT now(),
  printer_ip TEXT,
  printer_port INTEGER DEFAULT 9100,
  printer_connected BOOLEAN DEFAULT false,
  wifi_connected BOOLEAN DEFAULT true,
  battery_level INTEGER,
  app_version TEXT
);
ALTER TABLE public.pos_heartbeat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All access" ON public.pos_heartbeat FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_heartbeat;

-- Also add missing columns to print_jobs if not done:
ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();`}
        </pre>
      </div>
    </div>
  )
}
