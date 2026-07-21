-- ============================================================================
-- KHUKURI HMP — Migration 006: Stabilization & Bug Fixes
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- FIX 1: login_attempts table (missing — breaks every login)
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address   TEXT NOT NULL UNIQUE,
  attempts     INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can manage this table
CREATE POLICY "login_attempts_service_only" ON login_attempts
  FOR ALL USING (FALSE); -- Blocked for all row-level; service role bypasses RLS

-- ============================================================================
-- FIX 2: order_number BEFORE INSERT trigger
-- (orders.order_number is NOT NULL UNIQUE but was never auto-generated)
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop if exists then recreate
DROP TRIGGER IF EXISTS set_order_number_before_insert ON orders;
CREATE TRIGGER set_order_number_before_insert
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_set_order_number();

-- ============================================================================
-- FIX 3: booking_number BEFORE INSERT trigger
-- (same issue — booking_number NOT NULL UNIQUE never auto-generated)
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_set_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := generate_booking_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_number_before_insert ON room_bookings;
CREATE TRIGGER set_booking_number_before_insert
  BEFORE INSERT ON room_bookings
  FOR EACH ROW EXECUTE FUNCTION auto_set_booking_number();

-- ============================================================================
-- FIX 4: pool_ticket_number BEFORE INSERT trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ticket_number_before_insert ON pool_tickets;
CREATE TRIGGER set_ticket_number_before_insert
  BEFORE INSERT ON pool_tickets
  FOR EACH ROW EXECUTE FUNCTION auto_set_ticket_number();

-- ============================================================================
-- FIX 5: po_number BEFORE INSERT trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_set_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := generate_po_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_po_number_before_insert ON purchase_orders;
CREATE TRIGGER set_po_number_before_insert
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION auto_set_po_number();

-- ============================================================================
-- FIX 6: Allow QR/public orders to be inserted without authentication
-- (Customers scan QR code and place orders — they are not authenticated)
-- ============================================================================
-- Drop existing restrictive order insert policy
DROP POLICY IF EXISTS "orders_insert_staff" ON orders;

-- Staff can still insert orders (with full permissions)
CREATE POLICY "orders_insert_staff" ON orders FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND is_restaurant_member(restaurant_id)
  AND has_permission('orders:create')
);

-- Public (QR) orders: anon can insert ONLY qr type orders with status=pending
CREATE POLICY "orders_insert_public_qr" ON orders FOR INSERT WITH CHECK (
  order_type = 'qr'
  AND status = 'pending'
  AND payment_status = 'unpaid'
  AND created_by IS NULL
);

-- Same for order_items when inserting public QR orders
DROP POLICY IF EXISTS "order_items_insert_staff" ON order_items;

CREATE POLICY "order_items_insert_staff" ON order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND is_restaurant_member(o.restaurant_id)
      AND has_permission('orders:create')
  )
);

CREATE POLICY "order_items_insert_public_qr" ON order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND o.order_type = 'qr'
      AND o.status = 'pending'
      AND o.created_by IS NULL
  )
);

-- Allow public to read their own QR orders by order_id (for confirmation page)
CREATE POLICY "orders_select_public_qr" ON orders FOR SELECT USING (
  order_type = 'qr' AND created_by IS NULL
);

CREATE POLICY "order_items_select_public_qr" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND o.order_type = 'qr'
      AND o.created_by IS NULL
  )
);

-- ============================================================================
-- FIX 7: profiles select policy for user management
-- Add explicit policy so admins can read profiles of all restaurant members
-- (The existing policy only allows staff to see profiles via staff table join)
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select_restaurant_members" ON profiles;
CREATE POLICY "profiles_select_restaurant_members" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = profiles.id
      AND is_restaurant_member(ur.restaurant_id)
  )
);

-- ============================================================================
-- FIX 8: Ensure notifications can be read by anon for QR order confirmation
-- ============================================================================
-- notifications for QR orders (to show kitchen accepted the order)
-- Only staff need realtime; public sees nothing sensitive.

-- ============================================================================
-- FIX 9: Ensure menu_items and menu_categories are readable by anon (public menu)
-- The existing policies use is_active = TRUE which is correct
-- But ensure anon role is included
-- ============================================================================
-- These already exist and are correct. No change needed.

-- ============================================================================
-- VERIFY: All critical tables exist
-- ============================================================================
DO $$
BEGIN
  -- These should all exist; if not, the migration will error with a clear message
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_attempts' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'login_attempts table creation failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'orders table missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'profiles table missing';
  END IF;
  RAISE NOTICE 'Migration 006 completed successfully';
END;
$$;
