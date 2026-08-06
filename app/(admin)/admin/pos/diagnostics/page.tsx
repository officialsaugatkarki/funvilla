'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isNativeAndroid, isPOSWorkerMode, enablePOSWorkerMode, disablePOSWorkerMode } from '@/lib/printing/thermal-plugin'
import { getWorkerStatus, forceHeartbeat } from '@/lib/printing/print-worker'
import { getPrintServerDiagnostics, type PrintServerDiagnostics } from '@/lib/printing/print-bridge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Wifi, Monitor } from 'lucide-react'
import { toast } from 'sonner'

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
  isPOSMode: boolean
  workerStarted: boolean
  processingJobs: number
  deviceId: string
  heartbeats: HeartbeatRow[]
  pendingJobs: number
  failedJobs: number
  serverDiag: PrintServerDiagnostics | null
  lastRefreshed: Date
}

function Dot({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) return null
  return <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
}

function Row({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium flex items-center gap-1">
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
    isPOSMode: false,
    workerStarted: false,
    processingJobs: 0,
    deviceId: '',
    heartbeats: [],
    pendingJobs: 0,
    failedJobs: 0,
    serverDiag: null,
    lastRefreshed: new Date(),
  })

  const load = async () => {
    setState(s => ({ ...s, loading: true }))
    const supabase = createClient()
    const workerStatus = getWorkerStatus()
    const serverDiag = await getPrintServerDiagnostics()

    const [heartbeatRes, pendingRes, failedRes] = await Promise.all([
      supabase.from('pos_heartbeat').select('*').order('last_seen', { ascending: false }),
      supabase.from('print_jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('print_jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    ])

    setState({
      loading: false,
      isAndroid: workerStatus.isAndroid,
      isPOSMode: workerStatus.isPOSMode,
      workerStarted: workerStatus.started,
      processingJobs: workerStatus.processingJobs,
      deviceId: workerStatus.deviceId,
      heartbeats: (heartbeatRes.data ?? []) as HeartbeatRow[],
      pendingJobs: pendingRes.count ?? 0,
      failedJobs: failedRes.count ?? 0,
      serverDiag,
      lastRefreshed: new Date(),
    })
  }

  useEffect(() => { load() }, [])

  const ageLabel = (isoDate: string) => {
    const s = Math.round((Date.now() - new Date(isoDate).getTime()) / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.round(s / 60)}m ago`
    return `${Math.round(s / 3600)}h ago`
  }

  const handleTestHeartbeat = async () => {
    try {
      await forceHeartbeat()
      toast.success('Heartbeat sent — refreshing...')
      setTimeout(load, 1500)
    } catch (e: any) {
      toast.error(`Heartbeat failed: ${e.message}`)
    }
  }

  const handleEnablePOSMode = () => {
    enablePOSWorkerMode()
    toast.success('POS Mode enabled — reloading page...')
    setTimeout(() => window.location.reload(), 1000)
  }

  const handleDisablePOSMode = () => {
    disablePOSWorkerMode()
    toast.success('POS Mode disabled — reloading page...')
    setTimeout(() => window.location.reload(), 1000)
  }

  const { serverDiag: sd, heartbeats } = state
  const latestHB = heartbeats[0] ?? null
  const isOnline = !!latestHB && Date.now() - new Date(latestHB.last_seen).getTime() < 60_000

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">🖨️ Print System Diagnostics</h1>
          <p className="text-xs text-muted-foreground mt-1">Last refreshed: {state.lastRefreshed.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {state.isPOSMode && (
            <Button variant="secondary" size="sm" onClick={handleTestHeartbeat} disabled={state.loading}>
              <Activity className="h-4 w-4 mr-1.5" />
              Send Test Heartbeat
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={state.loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* This Device */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">This Device</h2>
        <Row
          label="Platform"
          value={state.isAndroid ? '🤖 Android (Capacitor APK)' : '🌐 Browser / PWA'}
          ok={state.isAndroid}
        />
        <Row
          label="POS Worker Mode"
          value={state.isPOSMode ? 'Active' : 'Inactive (client only)'}
          ok={state.isPOSMode}
        />
        <Row
          label="Worker Running"
          value={state.workerStarted ? 'Yes' : 'No'}
          ok={state.workerStarted}
        />
        <Row label="Jobs Processing" value={state.processingJobs} ok={state.processingJobs === 0} />
        <Row label="Device ID" value={<span className="font-mono text-xs">{state.deviceId}</span>} />

        {/* Enable POS Mode for browser-based tablets */}
        {!state.isPOSMode && (
          <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <p className="text-xs font-semibold text-amber-600 mb-1">⚠️ Not detected as Android Capacitor APK</p>
            <p className="text-xs text-muted-foreground mb-3">
              If this is the Android POS tablet running in Chrome browser, enable POS Mode manually.
              This allows the heartbeat and print worker to run from any browser.
            </p>
            <Button size="sm" onClick={handleEnablePOSMode}>
              <Monitor className="h-4 w-4 mr-1.5" />
              Enable POS Worker Mode for This Browser
            </Button>
          </div>
        )}
        {state.isPOSMode && !state.isAndroid && (
          <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-emerald-500/10">
            <span className="text-xs font-medium text-emerald-600">✓ POS Worker Mode active (browser mode)</span>
            <Button size="sm" variant="ghost" onClick={handleDisablePOSMode} className="text-xs h-7">Disable</Button>
          </div>
        )}
      </div>

      {/* Android POS Server */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Android POS Server (from database)</h2>
        <Row label="Print Server Online" value={sd?.online ? 'Online' : 'Offline'} ok={sd?.online} />
        <Row label="Status" value={<span className="text-xs">{sd?.reason ?? '—'}</span>} />
        <Row label="Last Heartbeat" value={latestHB ? ageLabel(latestHB.last_seen) : 'Never received'} ok={isOnline} />
        <Row label="WiFi" value={latestHB?.wifi_connected ? 'Connected' : (latestHB ? 'Disconnected' : '—')} ok={latestHB?.wifi_connected} />
        <Row label="Printer Connected" value={latestHB?.printer_connected ? 'Yes' : (latestHB ? 'Not yet (connects on first job)' : '—')} ok={latestHB?.printer_connected} />
        {!latestHB && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 text-xs text-red-600 font-medium">
            ❌ No heartbeat received. Open the Android POS app and enable POS Worker Mode (above) if in browser mode.
          </div>
        )}
      </div>

      {/* Queue Status */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Print Queue</h2>
        <Row label="Pending Jobs" value={state.pendingJobs} ok={state.pendingJobs === 0} />
        <Row label="Failed Jobs" value={state.failedJobs} ok={state.failedJobs === 0} />
        {state.pendingJobs > 0 && (
          <p className="text-xs text-amber-600 mt-2">⚠️ {state.pendingJobs} job(s) are stuck as pending. Open the Android POS and enable POS Worker Mode to drain them.</p>
        )}
      </div>

      {/* Known Devices */}
      {heartbeats.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Known POS Devices</h2>
          {heartbeats.map(hb => {
            const hbAge = Date.now() - new Date(hb.last_seen).getTime()
            const online = hbAge < 60_000
            return (
              <div key={hb.device_id} className="py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{hb.device_name} <span className="font-mono text-xs text-muted-foreground">({hb.device_id})</span></span>
                  <Badge variant={online ? 'default' : 'secondary'}>{online ? '🟢 Online' : '⚫ Offline'}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <div>Last seen: {ageLabel(hb.last_seen)} — {new Date(hb.last_seen).toLocaleTimeString()}</div>
                  <div>Printer: {hb.printer_ip}:{hb.printer_port} {hb.printer_connected ? '✓' : '(not yet connected)'}</div>
                  <div>WiFi: {hb.wifi_connected ? '✓ Connected' : '✗ Disconnected'}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SQL Migration */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">SQL Migration (run once in Supabase)</h2>
        <a
          href="https://supabase.com/dashboard/project/hdeddtzjghzvhqkxeddy/sql"
          target="_blank"
          className="text-xs text-primary underline block mb-3"
        >
          Open Supabase SQL Editor →
        </a>
        <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS public.pos_heartbeat (
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
DROP POLICY IF EXISTS "All access" ON public.pos_heartbeat;
CREATE POLICY "All access" ON public.pos_heartbeat
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();`}</pre>
      </div>
    </div>
  )
}
