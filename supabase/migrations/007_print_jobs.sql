-- Create print_jobs table for relaying print requests to the Android POS client
CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_data JSONB NOT NULL,
    payment_method TEXT NOT NULL,
    tax_rate NUMERIC NOT NULL,
    service_charge_rate NUMERIC DEFAULT 0,
    paper_width INTEGER DEFAULT 80,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (like admin) to read/insert/update
CREATE POLICY "Allow authenticated users full access to print_jobs"
    ON public.print_jobs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_print_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_print_jobs_timestamp
    BEFORE UPDATE ON public.print_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_print_jobs_updated_at();

-- Enable Realtime for the print_jobs table so clients can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
