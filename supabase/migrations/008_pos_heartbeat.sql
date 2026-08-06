-- Add retry tracking fields to print_jobs
ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Create pos_heartbeat table for Android POS devices to announce themselves
CREATE TABLE IF NOT EXISTS public.pos_heartbeat (
    device_id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    printer_ip TEXT,
    printer_port INTEGER DEFAULT 9100,
    printer_connected BOOLEAN DEFAULT false,
    wifi_connected BOOLEAN DEFAULT true,
    battery_level INTEGER,
    app_version TEXT
);

-- Enable RLS on pos_heartbeat
ALTER TABLE public.pos_heartbeat ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated access
CREATE POLICY IF NOT EXISTS "Allow all authenticated on pos_heartbeat"
    ON public.pos_heartbeat
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow anon read for heartbeat check (iPhone PWA checks without being logged in sometimes)
CREATE POLICY IF NOT EXISTS "Allow anon read on pos_heartbeat"
    ON public.pos_heartbeat
    FOR SELECT
    TO anon
    USING (true);

-- Enable Realtime for pos_heartbeat
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_heartbeat;
