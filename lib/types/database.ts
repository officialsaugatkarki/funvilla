// ============================================================================
// KHUKURI HMP — TypeScript Database Types
// These mirror the PostgreSQL schema exactly.
// ============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ============================================================================
// ENUMS
// ============================================================================
export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'qr'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled' | 'voided'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'esewa' | 'khalti' | 'qr' | 'credit' | 'other'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'disabled'
export type TableShape = 'rectangle' | 'circle' | 'square'
export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance' | 'out_of_order'
export type HousekeepingStatus = 'clean' | 'dirty' | 'inspected' | 'out_of_order'
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
export type BookingSource = 'direct' | 'online' | 'phone' | 'walk_in' | 'ota'
export type PoolTicketType = 'adult' | 'child' | 'family' | 'member' | 'staff'
export type InventoryMovementType = 'purchase' | 'consumption' | 'waste' | 'adjustment' | 'transfer'
export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave'
export type SalaryType = 'monthly' | 'daily' | 'hourly'
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
export type DiscountType = 'percentage' | 'fixed' | 'bogo'
export type NotificationType = 'new_order' | 'booking' | 'room_ready' | 'low_stock' | 'payment' | 'employee_login'
export type ContactMessageStatus = 'unread' | 'read' | 'replied' | 'archived'
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
export type RoleName = 'owner' | 'admin' | 'manager' | 'reception' | 'cashier' | 'kitchen' | 'waiter' | 'housekeeping' | 'inventory_manager' | 'viewer'

// ============================================================================
// BASE TYPES
// ============================================================================
export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: RoleName
  display_name: string
  description: string | null
  is_system: boolean
  created_at: string
}

export interface Permission {
  id: string
  name: string
  description: string | null
  resource: string
  action: string
  created_at: string
}

export interface RolePermission {
  role_id: string
  permission_id: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  restaurant_id: string
  assigned_by: string | null
  assigned_at: string
}

export interface Restaurant {
  id: string
  name: string
  slug: string
  description: string | null
  tagline: string | null
  address: string | null
  city: string | null
  country: string
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  cover_image_url: string | null
  currency: string
  currency_symbol: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  restaurant_id: string
  name: string
  address: string | null
  phone: string | null
  is_main: boolean
  is_active: boolean
  created_at: string
}

export interface Settings {
  id: string
  restaurant_id: string
  business_hours: BusinessHours
  tax_rate: number
  service_charge_rate: number
  receipt_header: string | null
  receipt_footer: string | null
  print_logo: boolean
  email_enabled: boolean
  sms_enabled: boolean
  allow_qr_orders: boolean
  require_table_for_qr: boolean
  pool_adult_price: number
  pool_child_price: number
  pool_family_price: number
  pool_capacity: number
  loyalty_points_rate: number
  social_links: SocialLinks
  custom_settings: Json
  created_at: string
  updated_at: string
}

// ============================================================================
// MENU TYPES
// ============================================================================
export interface MenuCategory {
  id: string
  restaurant_id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price: number
  compare_price: number | null
  image_url: string | null
  is_available: boolean
  is_featured: boolean
  is_popular: boolean
  is_vegetarian: boolean
  is_vegan: boolean
  spice_level: number
  preparation_time: number | null
  calories: number | null
  sort_order: number
  tags: string[]
  metadata: Json
  created_at: string
  updated_at: string
}

export interface MenuItemWithCategory extends MenuItem {
  menu_categories: MenuCategory | null
}

export interface MenuItemImage {
  id: string
  menu_item_id: string
  url: string
  alt_text: string | null
  sort_order: number
  created_at: string
}

// ============================================================================
// CUSTOMER TYPES
// ============================================================================
export interface Customer {
  id: string
  restaurant_id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  date_of_birth: string | null
  notes: string | null
  loyalty_points: number
  total_visits: number
  total_spent: number
  tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// DISCOUNT TYPES
// ============================================================================
export interface Discount {
  id: string
  restaurant_id: string
  name: string
  code: string | null
  type: DiscountType
  value: number
  min_order_amount: number
  max_discount_amount: number | null
  usage_limit: number | null
  used_count: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

// ============================================================================
// TABLE TYPES
// ============================================================================
export interface RestaurantTable {
  id: string
  restaurant_id: string
  branch_id: string | null
  table_number: string
  capacity: number
  floor: string
  section: string | null
  x_position: number
  y_position: number
  width: number
  height: number
  shape: TableShape
  status: TableStatus
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TableSession {
  id: string
  table_id: string
  restaurant_id: string
  opened_by: string
  closed_by: string | null
  customer_count: number
  status: 'open' | 'closed'
  opened_at: string
  closed_at: string | null
}

// ============================================================================
// ORDER TYPES
// ============================================================================
export interface Order {
  id: string
  order_number: string
  restaurant_id: string
  branch_id: string | null
  table_id: string | null
  table_session_id: string | null
  customer_id: string | null
  created_by: string | null
  served_by: string | null
  order_type: OrderType
  status: OrderStatus
  payment_status: PaymentStatus
  subtotal: number
  discount_amount: number
  tax_amount: number
  service_charge_amount: number
  tip_amount: number
  total: number
  discount_id: string | null
  coupon_code: string | null
  notes: string | null
  special_instructions: string | null
  customer_name: string | null
  customer_phone: string | null
  estimated_time: number | null
  confirmed_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface OrderWithDetails extends Order {
  order_items: OrderItem[]
  restaurant_tables: RestaurantTable | null
  customers: Customer | null
  profiles: Profile | null
  customer_name_resolved?: string
  table_number?: string | null
  created_by_name?: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  menu_item_name: string
  menu_item_price: number
  category_name: string | null
  quantity: number
  unit_price: number
  total_price: number
  notes: string | null
  status: OrderItemStatus
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================
export interface Payment {
  id: string
  order_id: string
  restaurant_id: string
  processed_by: string | null
  payment_method: PaymentMethod
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// ROOM TYPES
// ============================================================================
export interface RoomType {
  id: string
  restaurant_id: string
  name: string
  slug: string
  description: string | null
  base_price: number
  max_occupancy: number
  bed_configuration: string | null
  size_sqft: number | null
  amenities: string[]
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  restaurant_id: string
  room_type_id: string | null
  room_number: string
  floor: string | null
  status: RoomStatus
  housekeeping_status: HousekeepingStatus
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoomWithType extends Room {
  room_types: RoomType | null
}

export interface RoomImage {
  id: string
  room_type_id: string | null
  room_id: string | null
  url: string
  alt_text: string | null
  sort_order: number
  created_at: string
}

// ============================================================================
// BOOKING TYPES
// ============================================================================
export interface RoomBooking {
  id: string
  booking_number: string
  restaurant_id: string
  room_id: string | null
  room_type_id: string | null
  customer_id: string | null
  guest_name: string
  guest_email: string | null
  guest_phone: string
  guest_count: number
  check_in_date: string
  check_out_date: string
  actual_check_in: string | null
  actual_check_out: string | null
  nights: number
  room_rate: number
  subtotal: number
  tax_amount: number
  total: number
  deposit_amount: number
  status: BookingStatus
  payment_status: 'unpaid' | 'deposit_paid' | 'paid' | 'refunded'
  source: BookingSource
  special_requests: string | null
  notes: string | null
  confirmed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// POOL TYPES
// ============================================================================
export interface PoolTicket {
  id: string
  restaurant_id: string
  ticket_number: string
  ticket_type: PoolTicketType
  visitor_name: string | null
  visitor_count: number
  price: number
  payment_method: string
  payment_status: string
  valid_date: string
  check_in_time: string | null
  check_out_time: string | null
  sold_by: string | null
  notes: string | null
  created_at: string
}

// ============================================================================
// INVENTORY TYPES
// ============================================================================
export interface Supplier {
  id: string
  restaurant_id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  payment_terms: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface InventoryItem {
  id: string
  restaurant_id: string
  supplier_id: string | null
  name: string
  sku: string | null
  category: string | null
  unit: string
  quantity: number
  min_quantity: number
  cost_per_unit: number
  location: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryStatus extends InventoryItem {
  supplier_name: string | null
  is_low_stock: boolean
  is_out_of_stock: boolean
}

export interface InventoryMovement {
  id: string
  restaurant_id: string
  inventory_id: string
  type: InventoryMovementType
  quantity: number
  reference_type: string | null
  reference_id: string | null
  cost_per_unit: number | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  restaurant_id: string
  supplier_id: string | null
  ordered_by: string | null
  approved_by: string | null
  status: PurchaseOrderStatus
  expected_date: string | null
  received_date: string | null
  subtotal: number
  tax_amount: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  inventory_id: string | null
  item_name: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  received_quantity: number
  created_at: string
}

export interface Recipe {
  id: string
  menu_item_id: string
  inventory_id: string
  quantity: number
  unit: string
  created_at: string
}

// ============================================================================
// STAFF TYPES
// ============================================================================
export interface Staff {
  id: string
  user_id: string
  restaurant_id: string
  employee_id: string | null
  department: string | null
  position: string | null
  salary: number | null
  salary_type: SalaryType
  hire_date: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  documents: Json[]
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffWithProfile extends Staff {
  profiles: Profile
  user_roles: UserRole[]
}

export interface Attendance {
  id: string
  staff_id: string
  restaurant_id: string
  date: string
  check_in: string | null
  check_out: string | null
  hours_worked: number | null
  status: AttendanceStatus
  notes: string | null
  created_at: string
}

// ============================================================================
// GALLERY & EVENTS
// ============================================================================
export interface GalleryItem {
  id: string
  restaurant_id: string
  title: string | null
  description: string | null
  image_url: string
  category: string
  sort_order: number
  is_public: boolean
  created_at: string
}

export interface Event {
  id: string
  restaurant_id: string
  title: string
  description: string | null
  image_url: string | null
  start_datetime: string
  end_datetime: string | null
  capacity: number | null
  ticket_price: number | null
  location: string | null
  status: EventStatus
  is_public: boolean
  created_at: string
}

// ============================================================================
// NOTIFICATIONS & LOGS
// ============================================================================
export interface Notification {
  id: string
  restaurant_id: string
  user_id: string | null
  type: NotificationType | string
  title: string
  body: string | null
  data: Json
  is_read: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  restaurant_id: string | null
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  old_values: Json | null
  new_values: Json | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// ============================================================================
// PUBLIC-FACING TYPES
// ============================================================================
export interface Review {
  id: string
  restaurant_id: string
  customer_id: string | null
  order_id: string | null
  rating: number
  title: string | null
  body: string | null
  is_approved: boolean
  is_featured: boolean
  reviewer_name: string
  reviewer_avatar_url: string | null
  created_at: string
}

export interface ContactMessage {
  id: string
  restaurant_id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  status: ContactMessageStatus
  replied_at: string | null
  reply_message: string | null
  created_at: string
}

export interface Newsletter {
  id: string
  restaurant_id: string
  email: string
  name: string | null
  is_active: boolean
  subscribed_at: string
  unsubscribed_at: string | null
}

// ============================================================================
// VIEW TYPES
// ============================================================================
export interface OrderWithDetails2 {
  id: string
  order_number: string
  restaurant_id: string
  table_number: string | null
  table_section: string | null
  customer_name_resolved: string | null
  customer_phone_resolved: string | null
  created_by_name: string | null
  item_count: number
  status: OrderStatus
  payment_status: PaymentStatus
  total: number
  order_type: OrderType
  created_at: string
}

export interface DashboardMetrics {
  restaurant_id: string
  date: string
  total_orders: number
  completed_orders: number
  revenue: number
  active_tables: number
  pending_orders: number
}

// ============================================================================
// HELPER TYPES
// ============================================================================
export interface BusinessHours {
  monday:    DayHours
  tuesday:   DayHours
  wednesday: DayHours
  thursday:  DayHours
  friday:    DayHours
  saturday:  DayHours
  sunday:    DayHours
}

export interface DayHours {
  open: string
  close: string
  is_closed: boolean
}

export interface SocialLinks {
  facebook?: string
  instagram?: string
  twitter?: string
  youtube?: string
  tiktok?: string
}

// Cart types (client-side state only)
export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  image_url: string | null
  notes: string
  categoryName: string | null
}

// POS types
export interface POSCart {
  items: CartItem[]
  customerId: string | null
  tableId: string | null
  orderType: OrderType
  discountId: string | null
  couponCode: string | null
  notes: string
  tipAmount: number
}

export interface POSReceipt {
  order: Order
  items: OrderItem[]
  payment: Payment
  restaurant: Restaurant
  settings: Settings
}

// API response wrapper
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}
