DROP POLICY IF EXISTS "Allow authenticated users full access to print_jobs" ON public.print_jobs;
CREATE POLICY "Allow public access to print_jobs"
    ON public.print_jobs
    FOR ALL
    USING (true)
    WITH CHECK (true);
