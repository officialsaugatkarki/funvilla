-- ============================================================================
-- KHUKURI HMP — Migration 003: Database Functions, Triggers & Views
-- ============================================================================

-- ============================================================================
-- FUNCTION: Auto-create profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- FUNCTION: Generate order number (e.g., ORD-20240101-0001)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today_prefix TEXT;
  today_count  INTEGER;
BEGIN
  today_prefix := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE order_number LIKE today_prefix || '%';
  RETURN today_prefix || '-' || LPAD(today_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Generate booking number (e.g., BKG-20240101-0001)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
DECLARE
  today_prefix TEXT;
  today_count  INTEGER;
BEGIN
  today_prefix := 'BKG-' || TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO today_count
  FROM room_bookings
  WHERE booking_number LIKE today_prefix || '%';
  RETURN today_prefix || '-' || LPAD(today_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Generate ticket number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  today_prefix TEXT;
  today_count  INTEGER;
BEGIN
  today_prefix := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO today_count
  FROM pool_tickets
  WHERE ticket_number LIKE today_prefix || '%';
  RETURN today_prefix || '-' || LPAD(today_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Generate PO number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
  today_prefix TEXT;
  today_count  INTEGER;
BEGIN
  today_prefix := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO today_count
  FROM purchase_orders
  WHERE po_number LIKE today_prefix || '%';
  RETURN today_prefix || '-' || LPAD(today_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Recalculate order totals
-- Called after order_items change
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_order_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal      NUMERIC(10,2);
  v_tax_rate      NUMERIC(5,2);
  v_svc_rate      NUMERIC(5,2);
  v_discount      NUMERIC(10,2);
  v_restaurant_id UUID;
BEGIN
  -- Get restaurant from order
  SELECT restaurant_id, discount_amount INTO v_restaurant_id, v_discount
  FROM orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  -- Get tax and service charge rates from settings
  SELECT tax_rate, service_charge_rate INTO v_tax_rate, v_svc_rate
  FROM settings WHERE restaurant_id = v_restaurant_id;

  -- Sum active item totals
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    AND status != 'cancelled';

  UPDATE orders SET
    subtotal                = v_subtotal,
    tax_amount              = ROUND((v_subtotal - COALESCE(v_discount, 0)) * COALESCE(v_tax_rate, 0) / 100, 2),
    service_charge_amount   = ROUND((v_subtotal - COALESCE(v_discount, 0)) * COALESCE(v_svc_rate, 0) / 100, 2),
    total = ROUND(
      v_subtotal
      - COALESCE(v_discount, 0)
      + ROUND((v_subtotal - COALESCE(v_discount, 0)) * COALESCE(v_tax_rate, 0) / 100, 2)
      + ROUND((v_subtotal - COALESCE(v_discount, 0)) * COALESCE(v_svc_rate, 0) / 100, 2),
      2
    )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER recalculate_totals_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_order_totals();

-- ============================================================================
-- FUNCTION: Update table status on order changes
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_table_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When an order is created for a dine_in table, mark table as occupied
  IF TG_OP = 'INSERT' AND NEW.table_id IS NOT NULL AND NEW.order_type = 'dine_in' THEN
    UPDATE restaurant_tables
    SET status = 'occupied'
    WHERE id = NEW.table_id;
  END IF;

  -- When an order is completed/cancelled/voided, check if any open orders remain on that table
  IF TG_OP = 'UPDATE' AND NEW.table_id IS NOT NULL
    AND NEW.status IN ('completed', 'cancelled', 'voided')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM orders
      WHERE table_id = NEW.table_id
        AND status NOT IN ('completed', 'cancelled', 'voided')
        AND id != NEW.id
    ) THEN
      UPDATE restaurant_tables
      SET status = 'cleaning'
      WHERE id = NEW.table_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_table_on_order_change
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION sync_table_status();

-- ============================================================================
-- FUNCTION: Deduct inventory on order item creation (recipe-based)
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_inventory_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_recipe RECORD;
  v_restaurant_id UUID;
BEGIN
  -- Only deduct when item moves to 'preparing'
  IF TG_OP = 'UPDATE' AND OLD.status != 'preparing' AND NEW.status = 'preparing' THEN
    SELECT restaurant_id INTO v_restaurant_id FROM orders WHERE id = NEW.order_id;

    FOR v_recipe IN
      SELECT r.inventory_id, (r.quantity * NEW.quantity) AS total_qty
      FROM recipes r
      WHERE r.menu_item_id = NEW.menu_item_id
    LOOP
      -- Deduct from inventory
      UPDATE inventory
      SET quantity = quantity - v_recipe.total_qty
      WHERE id = v_recipe.inventory_id;

      -- Record movement
      INSERT INTO inventory_movements (
        restaurant_id, inventory_id, type, quantity,
        reference_type, reference_id, notes
      ) VALUES (
        v_restaurant_id, v_recipe.inventory_id, 'consumption', -v_recipe.total_qty,
        'order', NEW.order_id, 'Auto-deducted: Order ' || NEW.order_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER deduct_inventory_on_kitchen_prep
  AFTER UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION deduct_inventory_on_order();

-- ============================================================================
-- FUNCTION: Update customer stats on order completion
-- ============================================================================
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed'
    AND NEW.customer_id IS NOT NULL
  THEN
    UPDATE customers SET
      total_visits = total_visits + 1,
      total_spent  = total_spent + NEW.total
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_customer_on_order_complete
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- ============================================================================
-- FUNCTION: Send notification on new order (Supabase Realtime broadcast)
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a notification record (triggers Supabase Realtime)
  INSERT INTO notifications (restaurant_id, type, title, body, data)
  VALUES (
    NEW.restaurant_id,
    'new_order',
    'New Order: ' || NEW.order_number,
    'Order type: ' || NEW.order_type || '. Total: NPR ' || NEW.total,
    jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'order_type', NEW.order_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_new_order();

-- ============================================================================
-- FUNCTION: Auto-deduct discount usage
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.discount_id IS NOT NULL AND OLD.discount_id IS NULL THEN
    UPDATE discounts SET used_count = used_count + 1 WHERE id = NEW.discount_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_discount_usage
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION increment_discount_usage();

-- ============================================================================
-- FUNCTION: Update room status on booking changes
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_room_status_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'checked_in' AND NEW.room_id IS NOT NULL THEN
    UPDATE rooms SET status = 'occupied' WHERE id = NEW.room_id;
  ELSIF NEW.status IN ('checked_out', 'cancelled') AND NEW.room_id IS NOT NULL THEN
    UPDATE rooms SET status = 'cleaning' WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_room_on_booking_change
  AFTER UPDATE ON room_bookings
  FOR EACH ROW EXECUTE FUNCTION sync_room_status_on_booking();

-- ============================================================================
-- VIEW: orders_with_details (for admin order list)
-- ============================================================================
CREATE OR REPLACE VIEW orders_with_details AS
SELECT
  o.*,
  t.table_number,
  t.section as table_section,
  c.full_name as customer_name_resolved,
  c.phone as customer_phone_resolved,
  p.full_name as created_by_name,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.status != 'cancelled') as item_count
FROM orders o
LEFT JOIN restaurant_tables t ON t.id = o.table_id
LEFT JOIN customers c ON c.id = o.customer_id
LEFT JOIN profiles p ON p.id = o.created_by;

-- ============================================================================
-- VIEW: inventory_status (for low-stock alerts)
-- ============================================================================
CREATE OR REPLACE VIEW inventory_status AS
SELECT
  i.*,
  s.name as supplier_name,
  CASE WHEN i.quantity <= i.min_quantity THEN TRUE ELSE FALSE END as is_low_stock,
  CASE WHEN i.quantity = 0 THEN TRUE ELSE FALSE END as is_out_of_stock
FROM inventory i
LEFT JOIN suppliers s ON s.id = i.supplier_id
WHERE i.is_active = TRUE;

-- ============================================================================
-- VIEW: dashboard_metrics (one-row daily summary per restaurant)
-- ============================================================================
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT
  restaurant_id,
  DATE(created_at AT TIME ZONE 'Asia/Kathmandu') as date,
  COUNT(*) FILTER (WHERE status NOT IN ('cancelled', 'voided')) as total_orders,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
  COALESCE(SUM(total) FILTER (WHERE status = 'completed' AND payment_status = 'paid'), 0) as revenue,
  COUNT(DISTINCT table_id) FILTER (WHERE table_id IS NOT NULL AND status NOT IN ('cancelled','voided','completed')) as active_tables,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_orders
FROM orders
GROUP BY restaurant_id, DATE(created_at AT TIME ZONE 'Asia/Kathmandu');

-- ============================================================================
-- VIEW: room_availability (for booking engine)
-- ============================================================================
CREATE OR REPLACE VIEW room_availability AS
SELECT
  rt.id as room_type_id,
  rt.restaurant_id,
  rt.name as room_type_name,
  rt.base_price,
  rt.max_occupancy,
  rt.amenities,
  rt.image_url,
  COUNT(r.id) as total_rooms,
  COUNT(r.id) FILTER (WHERE r.status = 'available') as available_rooms,
  COUNT(r.id) FILTER (WHERE r.status = 'occupied') as occupied_rooms
FROM room_types rt
LEFT JOIN rooms r ON r.room_type_id = rt.id AND r.is_active = TRUE
WHERE rt.is_active = TRUE
GROUP BY rt.id, rt.restaurant_id, rt.name, rt.base_price, rt.max_occupancy, rt.amenities, rt.image_url;
