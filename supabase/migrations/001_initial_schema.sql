-- ============================================================================
-- KHUKURI HOSPITALITY MANAGEMENT PLATFORM
-- Migration 001: Initial Schema
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ============================================================================
-- UTILITY FUNCTION: Auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROFILES
-- Extends auth.users with display info
-- ============================================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROLES & PERMISSIONS
-- ============================================================================
CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,  -- 'owner', 'admin', etc.
  display_name  TEXT NOT NULL,
  description   TEXT,
  is_system     BOOLEAN NOT NULL DEFAULT FALSE, -- cannot be deleted
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,  -- 'menu:create', 'orders:void'
  description   TEXT,
  resource      TEXT NOT NULL,         -- 'menu', 'orders', 'rooms'
  action        TEXT NOT NULL,         -- 'create', 'read', 'update', 'delete', 'access', 'manage', 'export'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- RESTAURANTS
-- ============================================================================
CREATE TABLE restaurants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT,
  tagline           TEXT,
  address           TEXT,
  city              TEXT,
  country           TEXT DEFAULT 'Nepal',
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  logo_url          TEXT,
  cover_image_url   TEXT,
  currency          TEXT NOT NULL DEFAULT 'NPR',
  currency_symbol   TEXT NOT NULL DEFAULT 'Rs.',
  timezone          TEXT NOT NULL DEFAULT 'Asia/Kathmandu',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USER ROLES (junction: user ↔ role ↔ restaurant)
-- ============================================================================
CREATE TABLE user_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES auth.users(id),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_id, restaurant_id)
);

-- ============================================================================
-- BRANCHES
-- ============================================================================
CREATE TABLE branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  phone           TEXT,
  is_main         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SETTINGS (one row per restaurant)
-- ============================================================================
CREATE TABLE settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id           UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE UNIQUE,
  business_hours          JSONB NOT NULL DEFAULT '{"monday":{"open":"08:00","close":"22:00","is_closed":false},"tuesday":{"open":"08:00","close":"22:00","is_closed":false},"wednesday":{"open":"08:00","close":"22:00","is_closed":false},"thursday":{"open":"08:00","close":"22:00","is_closed":false},"friday":{"open":"08:00","close":"22:00","is_closed":false},"saturday":{"open":"08:00","close":"22:00","is_closed":false},"sunday":{"open":"08:00","close":"22:00","is_closed":false}}',
  tax_rate                NUMERIC(5,2) NOT NULL DEFAULT 13.00,
  service_charge_rate     NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  receipt_header          TEXT,
  receipt_footer          TEXT DEFAULT 'Thank you for visiting Khukuri!',
  print_logo              BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  allow_qr_orders         BOOLEAN NOT NULL DEFAULT TRUE,
  require_table_for_qr    BOOLEAN NOT NULL DEFAULT TRUE,
  pool_adult_price        NUMERIC(10,2) NOT NULL DEFAULT 200.00,
  pool_child_price        NUMERIC(10,2) NOT NULL DEFAULT 150.00,
  pool_family_price       NUMERIC(10,2) NOT NULL DEFAULT 500.00,
  pool_capacity           INTEGER NOT NULL DEFAULT 100,
  loyalty_points_rate     NUMERIC(5,2) NOT NULL DEFAULT 1.00,  -- points per NPR spent
  social_links            JSONB NOT NULL DEFAULT '{}',
  custom_settings         JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MENU
-- ============================================================================
CREATE TABLE menu_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, slug)
);
CREATE TRIGGER set_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE menu_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id         UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  description         TEXT,
  price               NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_price       NUMERIC(10,2) CHECK (compare_price >= 0),
  image_url           TEXT,
  is_available        BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  is_popular          BOOLEAN NOT NULL DEFAULT FALSE,
  is_vegetarian       BOOLEAN NOT NULL DEFAULT FALSE,
  is_vegan            BOOLEAN NOT NULL DEFAULT FALSE,
  spice_level         INTEGER NOT NULL DEFAULT 0 CHECK (spice_level BETWEEN 0 AND 5),
  preparation_time    INTEGER CHECK (preparation_time >= 0), -- minutes
  calories            INTEGER CHECK (calories >= 0),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  tags                TEXT[] NOT NULL DEFAULT '{}',
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, slug)
);
CREATE INDEX idx_menu_items_restaurant_category ON menu_items(restaurant_id, category_id);
CREATE INDEX idx_menu_items_available ON menu_items(restaurant_id, is_available);
CREATE INDEX idx_menu_items_featured ON menu_items(restaurant_id, is_featured);
CREATE INDEX idx_menu_items_name_search ON menu_items USING gin(name gin_trgm_ops);
CREATE TRIGGER set_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE menu_item_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  alt_text        TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  date_of_birth   DATE,
  notes           TEXT,
  loyalty_points  INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  total_visits    INTEGER NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  total_spent     NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_spent >= 0),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customers_phone ON customers(restaurant_id, phone);
CREATE INDEX idx_customers_email ON customers(restaurant_id, email);
CREATE INDEX idx_customers_name_search ON customers USING gin(full_name gin_trgm_ops);
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DISCOUNTS / COUPONS
-- ============================================================================
CREATE TABLE discounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  code                TEXT,
  type                TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'bogo')),
  value               NUMERIC(10,2) NOT NULL CHECK (value >= 0),
  min_order_amount    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  max_discount_amount NUMERIC(10,2),
  usage_limit         INTEGER,
  used_count          INTEGER NOT NULL DEFAULT 0,
  valid_from          TIMESTAMPTZ,
  valid_until         TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, code)
);

-- ============================================================================
-- RESTAURANT TABLES (the physical dining tables)
-- ============================================================================
CREATE TABLE restaurant_tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  table_number    TEXT NOT NULL,
  capacity        INTEGER NOT NULL CHECK (capacity > 0),
  floor           TEXT NOT NULL DEFAULT 'Ground Floor',
  section         TEXT,
  x_position      NUMERIC NOT NULL DEFAULT 0,
  y_position      NUMERIC NOT NULL DEFAULT 0,
  width           NUMERIC NOT NULL DEFAULT 80,
  height          NUMERIC NOT NULL DEFAULT 80,
  shape           TEXT NOT NULL DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'circle', 'square')),
  status          TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'disabled')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, table_number)
);
CREATE TRIGGER set_restaurant_tables_updated_at
  BEFORE UPDATE ON restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE SESSIONS
-- ============================================================================
CREATE TABLE table_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id        UUID NOT NULL REFERENCES restaurant_tables(id),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id),
  opened_by       UUID NOT NULL REFERENCES auth.users(id),
  closed_by       UUID REFERENCES auth.users(id),
  customer_count  INTEGER NOT NULL DEFAULT 1 CHECK (customer_count > 0),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at       TIMESTAMPTZ
);

-- ============================================================================
-- ORDERS
-- ============================================================================
CREATE TABLE orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              TEXT NOT NULL UNIQUE,
  restaurant_id             UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id                 UUID REFERENCES branches(id),
  table_id                  UUID REFERENCES restaurant_tables(id),
  table_session_id          UUID REFERENCES table_sessions(id),
  customer_id               UUID REFERENCES customers(id),
  created_by                UUID REFERENCES auth.users(id),
  served_by                 UUID REFERENCES auth.users(id),
  order_type                TEXT NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery', 'qr')),
  status                    TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled', 'voided')),
  payment_status            TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
  subtotal                  NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  discount_amount           NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  tax_amount                NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  service_charge_amount     NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (service_charge_amount >= 0),
  tip_amount                NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tip_amount >= 0),
  total                     NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
  discount_id               UUID REFERENCES discounts(id),
  coupon_code               TEXT,
  notes                     TEXT,
  special_instructions      TEXT,
  customer_name             TEXT,
  customer_phone            TEXT,
  estimated_time            INTEGER, -- minutes
  confirmed_at              TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  cancelled_at              TIMESTAMPTZ,
  cancel_reason             TEXT,
  metadata                  JSONB NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_restaurant_date ON orders(restaurant_id, created_at DESC);
CREATE INDEX idx_orders_table ON orders(table_id, status);
CREATE INDEX idx_orders_payment_status ON orders(restaurant_id, payment_status);
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
CREATE TABLE order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id      UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_item_name    TEXT NOT NULL, -- snapshot at time of order
  menu_item_price   NUMERIC(10,2) NOT NULL, -- snapshot
  category_name     TEXT,
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price        NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price       NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE TRIGGER set_order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id),
  processed_by    UUID REFERENCES auth.users(id),
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'esewa', 'khalti', 'qr', 'credit', 'other')),
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'NPR',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_restaurant_date ON payments(restaurant_id, created_at DESC);
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROOM TYPES & ROOMS
-- ============================================================================
CREATE TABLE room_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  base_price      NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  max_occupancy   INTEGER NOT NULL CHECK (max_occupancy > 0),
  bed_configuration TEXT,
  size_sqft       INTEGER CHECK (size_sqft > 0),
  amenities       TEXT[] NOT NULL DEFAULT '{}',
  image_url       TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, slug)
);
CREATE TRIGGER set_room_types_updated_at
  BEFORE UPDATE ON room_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE rooms (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  room_type_id        UUID REFERENCES room_types(id) ON DELETE SET NULL,
  room_number         TEXT NOT NULL,
  floor               TEXT,
  status              TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'out_of_order')),
  housekeeping_status TEXT NOT NULL DEFAULT 'clean' CHECK (housekeeping_status IN ('clean', 'dirty', 'inspected', 'out_of_order')),
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, room_number)
);
CREATE TRIGGER set_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE room_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id    UUID REFERENCES room_types(id) ON DELETE CASCADE,
  room_id         UUID REFERENCES rooms(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  alt_text        TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (room_type_id IS NOT NULL OR room_id IS NOT NULL)
);

-- ============================================================================
-- ROOM BOOKINGS
-- ============================================================================
CREATE TABLE room_bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number    TEXT NOT NULL UNIQUE,
  restaurant_id     UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  room_id           UUID REFERENCES rooms(id) ON DELETE SET NULL,
  room_type_id      UUID REFERENCES room_types(id) ON DELETE SET NULL,
  customer_id       UUID REFERENCES customers(id),
  guest_name        TEXT NOT NULL,
  guest_email       TEXT,
  guest_phone       TEXT NOT NULL,
  guest_count       INTEGER NOT NULL DEFAULT 1 CHECK (guest_count > 0),
  check_in_date     DATE NOT NULL,
  check_out_date    DATE NOT NULL,
  actual_check_in   TIMESTAMPTZ,
  actual_check_out  TIMESTAMPTZ,
  nights            INTEGER NOT NULL CHECK (nights > 0),
  room_rate         NUMERIC(10,2) NOT NULL CHECK (room_rate >= 0),
  subtotal          NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total             NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  deposit_amount    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  payment_status    TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit_paid', 'paid', 'refunded')),
  source            TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct', 'online', 'phone', 'walk_in', 'ota')),
  special_requests  TEXT,
  notes             TEXT,
  confirmed_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (check_out_date > check_in_date)
);
CREATE INDEX idx_room_bookings_dates ON room_bookings(room_id, check_in_date, check_out_date);
CREATE INDEX idx_room_bookings_status ON room_bookings(restaurant_id, status);
CREATE TRIGGER set_room_bookings_updated_at
  BEFORE UPDATE ON room_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- POOL TICKETS
-- ============================================================================
CREATE TABLE pool_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ticket_number   TEXT NOT NULL UNIQUE,
  ticket_type     TEXT NOT NULL CHECK (ticket_type IN ('adult', 'child', 'family', 'member', 'staff')),
  visitor_name    TEXT,
  visitor_count   INTEGER NOT NULL DEFAULT 1 CHECK (visitor_count > 0),
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  payment_method  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'esewa', 'khalti', 'qr', 'other')),
  payment_status  TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
  valid_date      DATE NOT NULL,
  check_in_time   TIMESTAMPTZ,
  check_out_time  TIMESTAMPTZ,
  sold_by         UUID REFERENCES auth.users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pool_tickets_date ON pool_tickets(restaurant_id, valid_date);

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
CREATE TABLE suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  payment_terms   TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INVENTORY
-- ============================================================================
CREATE TABLE inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  sku             TEXT,
  category        TEXT,
  unit            TEXT NOT NULL, -- 'kg', 'litre', 'piece', 'packet', 'dozen'
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 0,
  min_quantity    NUMERIC(10,3) NOT NULL DEFAULT 0,
  cost_per_unit   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  location        TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inventory_low_stock ON inventory(restaurant_id, quantity, min_quantity);
CREATE TRIGGER set_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE inventory_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id),
  inventory_id    UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('purchase', 'consumption', 'waste', 'adjustment', 'transfer')),
  quantity        NUMERIC(10,3) NOT NULL, -- positive=in, negative=out
  reference_type  TEXT CHECK (reference_type IN ('order', 'purchase_order', 'adjustment', 'manual')),
  reference_id    UUID,
  cost_per_unit   NUMERIC(10,2),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inventory_movements_inventory ON inventory_movements(inventory_id, created_at DESC);

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number       TEXT NOT NULL UNIQUE,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  ordered_by      UUID REFERENCES auth.users(id),
  approved_by     UUID REFERENCES auth.users(id),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
  expected_date   DATE,
  received_date   DATE,
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_amount      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_id        UUID REFERENCES inventory(id) ON DELETE SET NULL,
  item_name           TEXT NOT NULL,
  quantity            NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  unit                TEXT NOT NULL,
  unit_cost           NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost          NUMERIC(10,2) NOT NULL CHECK (total_cost >= 0),
  received_quantity   NUMERIC(10,3) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- RECIPES (links menu items to inventory)
-- ============================================================================
CREATE TABLE recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  inventory_id    UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  quantity        NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  unit            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (menu_item_id, inventory_id)
);

-- ============================================================================
-- STAFF
-- ============================================================================
CREATE TABLE staff (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  employee_id         TEXT UNIQUE,
  department          TEXT,
  position            TEXT,
  salary              NUMERIC(10,2) CHECK (salary >= 0),
  salary_type         TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly')),
  hire_date           DATE,
  emergency_contact   TEXT,
  emergency_phone     TEXT,
  documents           JSONB NOT NULL DEFAULT '[]',
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER set_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id),
  date            DATE NOT NULL,
  check_in        TIMESTAMPTZ,
  check_out       TIMESTAMPTZ,
  hours_worked    NUMERIC(5,2),
  status          TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, date)
);

-- ============================================================================
-- GALLERY
-- ============================================================================
CREATE TABLE gallery (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title           TEXT,
  description     TEXT,
  image_url       TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- EVENTS
-- ============================================================================
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  start_datetime  TIMESTAMPTZ NOT NULL,
  end_datetime    TIMESTAMPTZ,
  capacity        INTEGER CHECK (capacity > 0),
  ticket_price    NUMERIC(10,2) CHECK (ticket_price >= 0),
  location        TEXT,
  status          TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = broadcast to all
  type            TEXT NOT NULL, -- 'new_order', 'booking', 'room_ready', 'low_stock', 'payment'
  title           TEXT NOT NULL,
  body            TEXT,
  data            JSONB NOT NULL DEFAULT '{}',
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_restaurant ON notifications(restaurant_id, created_at DESC);

-- ============================================================================
-- ACTIVITY / AUDIT LOGS
-- ============================================================================
CREATE TABLE activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID REFERENCES restaurants(id),
  user_id         UUID REFERENCES auth.users(id),
  action          TEXT NOT NULL, -- 'order.created', 'menu_item.updated', 'user.login'
  resource_type   TEXT,
  resource_id     UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_logs_restaurant ON activity_logs(restaurant_id, created_at DESC);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);

-- ============================================================================
-- REVIEWS
-- ============================================================================
CREATE TABLE reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES customers(id),
  order_id            UUID REFERENCES orders(id),
  rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title               TEXT,
  body                TEXT,
  is_approved         BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  reviewer_name       TEXT NOT NULL,
  reviewer_avatar_url TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONTACT MESSAGES
-- ============================================================================
CREATE TABLE contact_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  subject         TEXT,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
  replied_at      TIMESTAMPTZ,
  reply_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NEWSLETTER
-- ============================================================================
CREATE TABLE newsletter (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     UUID NOT NULL REFERENCES restaurants(id),
  email             TEXT NOT NULL,
  name              TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  subscribed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at   TIMESTAMPTZ,
  UNIQUE (restaurant_id, email)
);

-- ============================================================================
-- SEED: Default Roles
-- ============================================================================
INSERT INTO roles (name, display_name, description, is_system) VALUES
  ('owner',               'Owner',              'Full access to everything. Cannot be restricted.', TRUE),
  ('admin',               'Administrator',      'Full access, managed by owner.',                  TRUE),
  ('manager',             'Manager',            'Operational management access.',                  TRUE),
  ('reception',           'Reception',          'Front-desk: bookings, check-in/out.',             TRUE),
  ('cashier',             'Cashier',            'POS, payments, billing.',                         TRUE),
  ('kitchen',             'Kitchen',            'Kitchen display and order status updates.',        TRUE),
  ('waiter',              'Waiter',             'Table orders and customer service.',               TRUE),
  ('housekeeping',        'Housekeeping',       'Room cleaning and status updates.',               TRUE),
  ('inventory_manager',   'Inventory Manager',  'Inventory, purchase orders, suppliers.',          TRUE),
  ('viewer',              'Viewer',             'Read-only access to dashboards.',                 TRUE);

-- ============================================================================
-- SEED: Default Permissions
-- ============================================================================
INSERT INTO permissions (name, description, resource, action) VALUES
  -- Dashboard
  ('dashboard:access',          'Access main dashboard',                      'dashboard',    'access'),
  -- Menu
  ('menu:read',                 'View menu items and categories',              'menu',         'read'),
  ('menu:create',               'Create menu items and categories',            'menu',         'create'),
  ('menu:update',               'Update menu items and categories',            'menu',         'update'),
  ('menu:delete',               'Delete menu items and categories',            'menu',         'delete'),
  -- Orders
  ('orders:read',               'View orders',                                 'orders',       'read'),
  ('orders:create',             'Create new orders',                           'orders',       'create'),
  ('orders:update',             'Update order status and items',               'orders',       'update'),
  ('orders:void',               'Void and cancel orders',                      'orders',       'void'),
  ('orders:export',             'Export order reports',                        'orders',       'export'),
  -- POS
  ('pos:access',                'Access POS terminal',                         'pos',          'access'),
  ('pos:discount',              'Apply discounts in POS',                      'pos',          'discount'),
  ('pos:void',                  'Void transactions in POS',                    'pos',          'void'),
  -- Kitchen
  ('kitchen:access',            'Access kitchen display system',               'kitchen',      'access'),
  ('kitchen:update',            'Update order item status in kitchen',         'kitchen',      'update'),
  -- Tables
  ('tables:read',               'View table layout and status',                'tables',       'read'),
  ('tables:manage',             'Manage table assignments and status',         'tables',       'manage'),
  -- Rooms
  ('rooms:read',                'View rooms and availability',                 'rooms',        'read'),
  ('rooms:checkin',             'Perform room check-in',                       'rooms',        'checkin'),
  ('rooms:checkout',            'Perform room check-out',                      'rooms',        'checkout'),
  ('rooms:manage',              'Full room and room type management',          'rooms',        'manage'),
  ('rooms:housekeeping',        'Update room housekeeping status',             'rooms',        'housekeeping'),
  -- Bookings
  ('bookings:read',             'View room and pool bookings',                 'bookings',     'read'),
  ('bookings:create',           'Create new bookings',                         'bookings',     'create'),
  ('bookings:update',           'Update booking status',                       'bookings',     'update'),
  ('bookings:cancel',           'Cancel bookings',                             'bookings',     'cancel'),
  -- Pool
  ('pool:access',               'Access pool management',                      'pool',         'access'),
  ('pool:tickets',              'Issue pool tickets',                          'pool',         'tickets'),
  -- Inventory
  ('inventory:read',            'View inventory levels',                       'inventory',    'read'),
  ('inventory:adjust',          'Adjust stock levels manually',                'inventory',    'adjust'),
  ('inventory:purchase',        'Create and manage purchase orders',           'inventory',    'purchase'),
  ('inventory:manage',          'Full inventory management',                   'inventory',    'manage'),
  -- Customers
  ('customers:read',            'View customer profiles',                      'customers',    'read'),
  ('customers:create',          'Create customer profiles',                    'customers',    'create'),
  ('customers:update',          'Update customer profiles',                    'customers',    'update'),
  ('customers:manage',          'Full customer management',                    'customers',    'manage'),
  -- Employees
  ('employees:read',            'View employee profiles',                      'employees',    'read'),
  ('employees:manage',          'Full employee management',                    'employees',    'manage'),
  -- Reports
  ('reports:read',              'View reports and analytics',                  'reports',      'read'),
  ('reports:export',            'Export reports to PDF/Excel/CSV',             'reports',      'export'),
  -- Settings
  ('settings:read',             'View system settings',                        'settings',     'read'),
  ('settings:manage',           'Manage all system settings',                  'settings',     'manage'),
  -- Activity Logs
  ('activity_logs:read',        'View activity and audit logs',                'activity_logs','read');

-- ============================================================================
-- SEED: Assign all permissions to owner role
-- ============================================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'owner';

-- Admin: all except settings:manage
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name NOT IN ('settings:manage');

-- Manager: most things
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager' AND p.name IN (
  'dashboard:access', 'menu:read', 'menu:update',
  'orders:read', 'orders:create', 'orders:update', 'orders:void', 'orders:export',
  'pos:access', 'pos:discount',
  'kitchen:access', 'kitchen:update',
  'tables:read', 'tables:manage',
  'rooms:read', 'rooms:checkin', 'rooms:checkout',
  'bookings:read', 'bookings:create', 'bookings:update', 'bookings:cancel',
  'pool:access', 'pool:tickets',
  'inventory:read', 'inventory:adjust',
  'customers:read', 'customers:create', 'customers:update',
  'employees:read',
  'reports:read', 'reports:export',
  'settings:read'
);

-- Reception
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'reception' AND p.name IN (
  'dashboard:access',
  'rooms:read', 'rooms:checkin', 'rooms:checkout',
  'bookings:read', 'bookings:create', 'bookings:update',
  'pool:access', 'pool:tickets',
  'customers:read', 'customers:create',
  'orders:read'
);

-- Cashier
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'cashier' AND p.name IN (
  'dashboard:access',
  'pos:access', 'pos:discount',
  'orders:read', 'orders:update',
  'tables:read',
  'customers:read', 'customers:create',
  'payments:read'
);

-- Kitchen
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'kitchen' AND p.name IN (
  'kitchen:access', 'kitchen:update',
  'orders:read',
  'menu:read'
);

-- Waiter
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'waiter' AND p.name IN (
  'dashboard:access',
  'orders:read', 'orders:create', 'orders:update',
  'tables:read', 'tables:manage',
  'menu:read',
  'customers:read'
);

-- Housekeeping
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'housekeeping' AND p.name IN (
  'rooms:read', 'rooms:housekeeping',
  'bookings:read'
);

-- Inventory Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'inventory_manager' AND p.name IN (
  'dashboard:access',
  'inventory:read', 'inventory:adjust', 'inventory:purchase', 'inventory:manage',
  'menu:read',
  'reports:read'
);

-- Viewer: read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'viewer' AND p.name IN (
  'dashboard:access',
  'menu:read', 'orders:read', 'rooms:read',
  'bookings:read', 'inventory:read', 'customers:read',
  'reports:read'
);
