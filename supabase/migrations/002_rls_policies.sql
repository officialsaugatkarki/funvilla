-- ============================================================================
-- KHUKURI HMP — Migration 002: Row Level Security Policies
-- ============================================================================

-- Enable RLS on every table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS for RLS
-- ============================================================================

-- Returns the restaurant_id for the current authenticated user
CREATE OR REPLACE FUNCTION get_user_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM user_roles
  WHERE user_id = auth.uid()
  ORDER BY assigned_at ASC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Checks if the current user has a specific permission in their restaurant
CREATE OR REPLACE FUNCTION has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.name = permission_name
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Checks if the current user belongs to a given restaurant
CREATE OR REPLACE FUNCTION is_restaurant_member(restaurant_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND restaurant_id = restaurant_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns true if user has the 'owner' role in any restaurant
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- PROFILES
-- ============================================================================
-- Users can read/update their own profile
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
-- Staff can be seen by members of same restaurant via staff table join
CREATE POLICY "profiles_select_staff" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.user_id = profiles.id
      AND is_restaurant_member(s.restaurant_id)
  )
);

-- ============================================================================
-- ROLES & PERMISSIONS (read-only for authenticated staff)
-- ============================================================================
CREATE POLICY "roles_select_authenticated" ON roles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "permissions_select_authenticated" ON permissions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "role_permissions_select_authenticated" ON role_permissions FOR SELECT TO authenticated USING (TRUE);
-- Only owners/admins can manage roles/permissions (use service role from server actions)

-- ============================================================================
-- USER ROLES
-- ============================================================================
CREATE POLICY "user_roles_select_own" ON user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_roles_select_manager" ON user_roles FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('employees:read')
);

-- ============================================================================
-- RESTAURANTS
-- ============================================================================
CREATE POLICY "restaurants_select_member" ON restaurants FOR SELECT USING (
  is_restaurant_member(id)
);

-- ============================================================================
-- BRANCHES
-- ============================================================================
CREATE POLICY "branches_select_member" ON branches FOR SELECT USING (
  is_restaurant_member(restaurant_id)
);

-- ============================================================================
-- SETTINGS
-- ============================================================================
CREATE POLICY "settings_select_member" ON settings FOR SELECT USING (
  is_restaurant_member(restaurant_id)
);
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('settings:manage')
);

-- ============================================================================
-- MENU CATEGORIES
-- ============================================================================
-- Public read (for the public menu page)
CREATE POLICY "menu_categories_select_public" ON menu_categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "menu_categories_insert_admin" ON menu_categories FOR INSERT WITH CHECK (
  is_restaurant_member(restaurant_id) AND has_permission('menu:create')
);
CREATE POLICY "menu_categories_update_admin" ON menu_categories FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('menu:update')
);
CREATE POLICY "menu_categories_delete_admin" ON menu_categories FOR DELETE USING (
  is_restaurant_member(restaurant_id) AND has_permission('menu:delete')
);

-- ============================================================================
-- MENU ITEMS
-- ============================================================================
CREATE POLICY "menu_items_select_public" ON menu_items FOR SELECT USING (TRUE);
CREATE POLICY "menu_items_insert_admin" ON menu_items FOR INSERT WITH CHECK (
  is_restaurant_member(restaurant_id) AND has_permission('menu:create')
);
CREATE POLICY "menu_items_update_admin" ON menu_items FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('menu:update')
);
CREATE POLICY "menu_items_delete_admin" ON menu_items FOR DELETE USING (
  is_restaurant_member(restaurant_id) AND has_permission('menu:delete')
);

-- ============================================================================
-- MENU ITEM IMAGES
-- ============================================================================
CREATE POLICY "menu_item_images_select_public" ON menu_item_images FOR SELECT USING (TRUE);
CREATE POLICY "menu_item_images_manage_admin" ON menu_item_images FOR ALL USING (
  EXISTS (
    SELECT 1 FROM menu_items mi
    WHERE mi.id = menu_item_images.menu_item_id
      AND is_restaurant_member(mi.restaurant_id)
      AND has_permission('menu:update')
  )
);

-- ============================================================================
-- CUSTOMERS
-- ============================================================================
CREATE POLICY "customers_select_staff" ON customers FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('customers:read')
);
CREATE POLICY "customers_insert_staff" ON customers FOR INSERT WITH CHECK (
  is_restaurant_member(restaurant_id) AND has_permission('customers:create')
);
CREATE POLICY "customers_update_staff" ON customers FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('customers:update')
);

-- ============================================================================
-- DISCOUNTS
-- ============================================================================
CREATE POLICY "discounts_select_staff" ON discounts FOR SELECT USING (
  is_restaurant_member(restaurant_id)
);
CREATE POLICY "discounts_manage_admin" ON discounts FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('settings:manage')
);

-- ============================================================================
-- RESTAURANT TABLES
-- ============================================================================
CREATE POLICY "tables_select_staff" ON restaurant_tables FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('tables:read')
);
CREATE POLICY "tables_manage_admin" ON restaurant_tables FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('tables:manage')
);

-- ============================================================================
-- TABLE SESSIONS
-- ============================================================================
CREATE POLICY "table_sessions_select_staff" ON table_sessions FOR SELECT USING (
  is_restaurant_member(restaurant_id)
);
CREATE POLICY "table_sessions_insert_staff" ON table_sessions FOR INSERT WITH CHECK (
  is_restaurant_member(restaurant_id) AND has_permission('tables:manage')
);
CREATE POLICY "table_sessions_update_staff" ON table_sessions FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('tables:manage')
);

-- ============================================================================
-- ORDERS
-- ============================================================================
CREATE POLICY "orders_select_staff" ON orders FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('orders:read')
);
CREATE POLICY "orders_insert_staff" ON orders FOR INSERT WITH CHECK (
  is_restaurant_member(restaurant_id) AND has_permission('orders:create')
);
CREATE POLICY "orders_update_staff" ON orders FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('orders:update')
);

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
CREATE POLICY "order_items_select_staff" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND is_restaurant_member(o.restaurant_id)
      AND has_permission('orders:read')
  )
);
CREATE POLICY "order_items_insert_staff" ON order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND is_restaurant_member(o.restaurant_id)
      AND has_permission('orders:create')
  )
);
CREATE POLICY "order_items_update_staff" ON order_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id
      AND is_restaurant_member(o.restaurant_id)
      AND has_permission('orders:update')
  )
);

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE POLICY "payments_select_staff" ON payments FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('pos:access')
);
CREATE POLICY "payments_insert_staff" ON payments FOR INSERT WITH CHECK (
  is_restaurant_member(restaurant_id) AND has_permission('pos:access')
);

-- ============================================================================
-- ROOM TYPES (public read for booking page)
-- ============================================================================
CREATE POLICY "room_types_select_public" ON room_types FOR SELECT USING (is_active = TRUE);
CREATE POLICY "room_types_manage_admin" ON room_types FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('rooms:manage')
);

-- ============================================================================
-- ROOMS
-- ============================================================================
CREATE POLICY "rooms_select_staff" ON rooms FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('rooms:read')
);
CREATE POLICY "rooms_manage_admin" ON rooms FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('rooms:manage')
);
CREATE POLICY "rooms_housekeeping" ON rooms FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('rooms:housekeeping')
);

-- ============================================================================
-- ROOM IMAGES (public read)
-- ============================================================================
CREATE POLICY "room_images_select_public" ON room_images FOR SELECT USING (TRUE);
CREATE POLICY "room_images_manage_admin" ON room_images FOR ALL USING (
  has_permission('rooms:manage')
);

-- ============================================================================
-- ROOM BOOKINGS
-- ============================================================================
-- Public: users can insert their own bookings (for the public booking form)
CREATE POLICY "room_bookings_insert_public" ON room_bookings FOR INSERT WITH CHECK (
  status = 'pending' AND payment_status = 'unpaid' -- only pending bookings
);
CREATE POLICY "room_bookings_select_staff" ON room_bookings FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('bookings:read')
);
CREATE POLICY "room_bookings_update_staff" ON room_bookings FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('bookings:update')
);

-- ============================================================================
-- POOL TICKETS
-- ============================================================================
CREATE POLICY "pool_tickets_select_staff" ON pool_tickets FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('pool:access')
);
CREATE POLICY "pool_tickets_insert_staff" ON pool_tickets FOR INSERT WITH CHECK (
  is_restaurant_member(restaurant_id) AND has_permission('pool:tickets')
);

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
CREATE POLICY "suppliers_all_inventory" ON suppliers FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('inventory:read')
);

-- ============================================================================
-- INVENTORY
-- ============================================================================
CREATE POLICY "inventory_select_staff" ON inventory FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('inventory:read')
);
CREATE POLICY "inventory_manage_admin" ON inventory FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('inventory:manage')
);

-- ============================================================================
-- INVENTORY MOVEMENTS
-- ============================================================================
CREATE POLICY "inventory_movements_select" ON inventory_movements FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('inventory:read')
);
CREATE POLICY "inventory_movements_insert" ON inventory_movements FOR INSERT WITH CHECK (
  is_restaurant_member(restaurant_id) AND has_permission('inventory:adjust')
);

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
CREATE POLICY "purchase_orders_all" ON purchase_orders FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('inventory:purchase')
);
CREATE POLICY "purchase_order_items_all" ON purchase_order_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
      AND is_restaurant_member(po.restaurant_id)
      AND has_permission('inventory:purchase')
  )
);

-- ============================================================================
-- RECIPES
-- ============================================================================
CREATE POLICY "recipes_select_staff" ON recipes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM menu_items mi
    WHERE mi.id = recipes.menu_item_id
      AND is_restaurant_member(mi.restaurant_id)
  )
);
CREATE POLICY "recipes_manage_admin" ON recipes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM menu_items mi
    WHERE mi.id = recipes.menu_item_id
      AND is_restaurant_member(mi.restaurant_id)
      AND has_permission('inventory:manage')
  )
);

-- ============================================================================
-- STAFF
-- ============================================================================
CREATE POLICY "staff_select_manager" ON staff FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('employees:read')
);
CREATE POLICY "staff_manage_admin" ON staff FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('employees:manage')
);
-- Users can see their own staff record
CREATE POLICY "staff_select_own" ON staff FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- ATTENDANCE
-- ============================================================================
CREATE POLICY "attendance_select_manager" ON attendance FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('employees:read')
);
CREATE POLICY "attendance_manage_admin" ON attendance FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('employees:manage')
);

-- ============================================================================
-- GALLERY (public read)
-- ============================================================================
CREATE POLICY "gallery_select_public" ON gallery FOR SELECT USING (is_public = TRUE);
CREATE POLICY "gallery_manage_admin" ON gallery FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('settings:manage')
);

-- ============================================================================
-- EVENTS (public read for active events)
-- ============================================================================
CREATE POLICY "events_select_public" ON events FOR SELECT USING (is_public = TRUE);
CREATE POLICY "events_manage_admin" ON events FOR ALL USING (
  is_restaurant_member(restaurant_id) AND has_permission('settings:manage')
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (
  user_id = auth.uid() OR (user_id IS NULL AND is_restaurant_member(restaurant_id))
);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (
  user_id = auth.uid()
);

-- ============================================================================
-- ACTIVITY LOGS
-- ============================================================================
CREATE POLICY "activity_logs_select_admin" ON activity_logs FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('activity_logs:read')
);
CREATE POLICY "activity_logs_insert_service" ON activity_logs FOR INSERT WITH CHECK (TRUE);

-- ============================================================================
-- REVIEWS (public read approved, staff manage)
-- ============================================================================
CREATE POLICY "reviews_select_public" ON reviews FOR SELECT USING (is_approved = TRUE);
CREATE POLICY "reviews_select_staff" ON reviews FOR SELECT USING (
  is_restaurant_member(restaurant_id)
);
CREATE POLICY "reviews_insert_public" ON reviews FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "reviews_manage_admin" ON reviews FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('settings:manage')
);

-- ============================================================================
-- CONTACT MESSAGES
-- ============================================================================
CREATE POLICY "contact_messages_insert_public" ON contact_messages FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "contact_messages_select_admin" ON contact_messages FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('settings:read')
);
CREATE POLICY "contact_messages_update_admin" ON contact_messages FOR UPDATE USING (
  is_restaurant_member(restaurant_id) AND has_permission('settings:manage')
);

-- ============================================================================
-- NEWSLETTER
-- ============================================================================
CREATE POLICY "newsletter_insert_public" ON newsletter FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "newsletter_select_admin" ON newsletter FOR SELECT USING (
  is_restaurant_member(restaurant_id) AND has_permission('settings:read')
);
CREATE POLICY "newsletter_update_own" ON newsletter FOR UPDATE USING (TRUE); -- for unsubscribe

-- ============================================================================
-- STORAGE BUCKETS (run via Supabase Dashboard or CLI)
-- ============================================================================
-- These are documented here as reference. Create in Dashboard:
-- Bucket: menu-images        (public: true)
-- Bucket: room-images        (public: true)
-- Bucket: gallery            (public: true)
-- Bucket: staff-avatars      (public: false)
-- Bucket: event-images       (public: true)
-- Bucket: documents          (public: false)
-- Bucket: avatars            (public: false)
-- Bucket: logos              (public: true)
