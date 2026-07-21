-- ============================================================================
-- KHUKURI HMP — Migration 004: Missing Tables (media, audit_logs)
-- ============================================================================

-- ============================================================================
-- MEDIA
-- Centralized table for all uploaded files/images
-- ============================================================================
CREATE TABLE IF NOT EXISTS media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL, -- e.g., 'image/jpeg', 'application/pdf'
  file_size     INTEGER,       -- in bytes
  bucket_path   TEXT NOT NULL, -- path in Supabase Storage
  public_url    TEXT NOT NULL,
  uploaded_by   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOGS
-- Required for strict compliance, separate from activity_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id),
  role_name     TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media visible to everyone" 
  ON media FOR SELECT USING (true);

CREATE POLICY "Media can be inserted by staff" 
  ON media FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Audit logs visible to owner and admin" 
  ON audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() 
      AND ur.restaurant_id = audit_logs.restaurant_id
      AND r.name IN ('owner', 'admin')
    )
  );

CREATE POLICY "Audit logs can be inserted by authenticated users" 
  ON audit_logs FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
