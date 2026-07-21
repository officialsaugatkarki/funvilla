-- Create login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
    ip_address text PRIMARY KEY,
    attempts integer DEFAULT 1,
    locked_until timestamp with time zone,
    last_attempt timestamp with time zone DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- No policies needed, only accessed via server actions using service_role key

-- Enable storage extension if not already enabled
-- Note: Supabase handles the storage schema internally, we just insert into buckets

INSERT INTO storage.buckets (id, name, public) VALUES 
('menu-images', 'menu-images', true),
('room-images', 'room-images', true),
('gallery', 'gallery', true),
('avatars', 'avatars', true),
('staff', 'staff', true),
('documents', 'documents', true),
('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for public access (select) and authenticated upload (insert/update)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('menu-images', 'room-images', 'gallery', 'avatars', 'staff', 'documents', 'events'));
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('menu-images', 'room-images', 'gallery', 'avatars', 'staff', 'documents', 'events'));
CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('menu-images', 'room-images', 'gallery', 'avatars', 'staff', 'documents', 'events'));
CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('menu-images', 'room-images', 'gallery', 'avatars', 'staff', 'documents', 'events'));
