-- Migration: Create swimming_tickets table (separate from pool_tickets)
-- Swimming section is a new independent feature with visitor contact details.

CREATE TABLE IF NOT EXISTS swimming_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ticket_number    TEXT NOT NULL UNIQUE,
  ticket_type      TEXT NOT NULL DEFAULT 'adult' CHECK (ticket_type IN ('adult', 'child', 'family', 'member', 'staff')),
  visitor_name     TEXT,
  visitor_phone    TEXT,
  visitor_address  TEXT,
  visitor_gender   TEXT CHECK (visitor_gender IN ('male', 'female', 'other')),
  visitor_count    INTEGER NOT NULL DEFAULT 1 CHECK (visitor_count > 0),
  price            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  payment_method   TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'esewa', 'khalti', 'qr', 'other', 'room_charge')),
  payment_status   TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  valid_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sold_by          UUID REFERENCES auth.users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate a sequential ticket number via trigger
CREATE SEQUENCE IF NOT EXISTS swimming_ticket_seq START 1000;

CREATE OR REPLACE FUNCTION set_swimming_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'SW-' || LPAD(nextval('swimming_ticket_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_swimming_ticket_number_before_insert ON swimming_tickets;
CREATE TRIGGER set_swimming_ticket_number_before_insert
  BEFORE INSERT ON swimming_tickets
  FOR EACH ROW EXECUTE FUNCTION set_swimming_ticket_number();

CREATE INDEX IF NOT EXISTS idx_swimming_tickets_date ON swimming_tickets(restaurant_id, valid_date);

-- RLS
ALTER TABLE swimming_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swimming_tickets_select_staff" ON swimming_tickets FOR SELECT USING (
  restaurant_id IN (SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid())
);
CREATE POLICY "swimming_tickets_insert_staff" ON swimming_tickets FOR INSERT WITH CHECK (
  restaurant_id IN (SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid())
);
