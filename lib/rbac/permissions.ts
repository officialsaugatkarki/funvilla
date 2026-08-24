import type { RoleName } from '@/lib/types'

// ============================================================================
// ALL PERMISSION CONSTANTS
// Format: resource:action
// ============================================================================
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_ACCESS:         'dashboard:access',
  // Menu
  MENU_READ:                'menu:read',
  MENU_CREATE:              'menu:create',
  MENU_UPDATE:              'menu:update',
  MENU_DELETE:              'menu:delete',
  // Orders
  ORDERS_READ:              'orders:read',
  ORDERS_CREATE:            'orders:create',
  ORDERS_UPDATE:            'orders:update',
  ORDERS_VOID:              'orders:void',
  ORDERS_EXPORT:            'orders:export',
  // POS
  POS_ACCESS:               'pos:access',
  POS_DISCOUNT:             'pos:discount',
  POS_VOID:                 'pos:void',
  // Kitchen
  KITCHEN_ACCESS:           'kitchen:access',
  KITCHEN_UPDATE:           'kitchen:update',
  // Tables
  TABLES_READ:              'tables:read',
  TABLES_MANAGE:            'tables:manage',
  // Rooms
  ROOMS_READ:               'rooms:read',
  ROOMS_CHECKIN:            'rooms:checkin',
  ROOMS_CHECKOUT:           'rooms:checkout',
  ROOMS_MANAGE:             'rooms:manage',
  ROOMS_HOUSEKEEPING:       'rooms:housekeeping',
  // Bookings
  BOOKINGS_READ:            'bookings:read',
  BOOKINGS_CREATE:          'bookings:create',
  BOOKINGS_UPDATE:          'bookings:update',
  BOOKINGS_CANCEL:          'bookings:cancel',
  // Pool
  POOL_ACCESS:              'pool:access',
  POOL_TICKETS:             'pool:tickets',
  // Inventory
  INVENTORY_READ:           'inventory:read',
  INVENTORY_ADJUST:         'inventory:adjust',
  INVENTORY_PURCHASE:       'inventory:purchase',
  INVENTORY_MANAGE:         'inventory:manage',
  // Customers
  CUSTOMERS_READ:           'customers:read',
  CUSTOMERS_CREATE:         'customers:create',
  CUSTOMERS_UPDATE:         'customers:update',
  CUSTOMERS_MANAGE:         'customers:manage',
  // Employees
  EMPLOYEES_READ:           'employees:read',
  EMPLOYEES_MANAGE:         'employees:manage',
  // Reports
  REPORTS_READ:             'reports:read',
  REPORTS_EXPORT:           'reports:export',
  // Settings
  SETTINGS_READ:            'settings:read',
  SETTINGS_MANAGE:          'settings:manage',
  // Users
  USERS_MANAGE:             'users:manage',
  // Activity Logs
  ACTIVITY_LOGS_READ:       'activity_logs:read',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// ============================================================================
// DEFAULT ROLE → PERMISSION MAP (mirrors database seed)
// Used for client-side pre-checks only — server-side always queries DB.
// ============================================================================
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  owner: Object.values(PERMISSIONS),
  admin: Object.values(PERMISSIONS).filter(p => p !== PERMISSIONS.SETTINGS_MANAGE),
  manager: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.MENU_READ, PERMISSIONS.MENU_UPDATE,
    PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_UPDATE, PERMISSIONS.ORDERS_VOID, PERMISSIONS.ORDERS_EXPORT,
    PERMISSIONS.POS_ACCESS, PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.KITCHEN_ACCESS, PERMISSIONS.KITCHEN_UPDATE,
    PERMISSIONS.TABLES_READ, PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.ROOMS_READ, PERMISSIONS.ROOMS_CHECKIN, PERMISSIONS.ROOMS_CHECKOUT,
    PERMISSIONS.BOOKINGS_READ, PERMISSIONS.BOOKINGS_CREATE, PERMISSIONS.BOOKINGS_UPDATE, PERMISSIONS.BOOKINGS_CANCEL,
    PERMISSIONS.POOL_ACCESS, PERMISSIONS.POOL_TICKETS,
    PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.CUSTOMERS_CREATE, PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_READ,
  ],
  reception: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.ROOMS_READ, PERMISSIONS.ROOMS_CHECKIN, PERMISSIONS.ROOMS_CHECKOUT,
    PERMISSIONS.BOOKINGS_READ, PERMISSIONS.BOOKINGS_CREATE, PERMISSIONS.BOOKINGS_UPDATE,
    PERMISSIONS.POOL_ACCESS, PERMISSIONS.POOL_TICKETS,
    PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.ORDERS_READ,
  ],
  cashier: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.POS_ACCESS, PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.CUSTOMERS_CREATE,
  ],
  kitchen: [
    PERMISSIONS.KITCHEN_ACCESS, PERMISSIONS.KITCHEN_UPDATE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.MENU_READ,
  ],
  waiter: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.TABLES_READ, PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.MENU_READ,
    PERMISSIONS.CUSTOMERS_READ,
  ],
  housekeeping: [
    PERMISSIONS.ROOMS_READ, PERMISSIONS.ROOMS_HOUSEKEEPING,
    PERMISSIONS.BOOKINGS_READ,
  ],
  inventory_manager: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_ADJUST, PERMISSIONS.INVENTORY_PURCHASE, PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.MENU_READ,
    PERMISSIONS.REPORTS_READ,
  ],
  viewer: [
    PERMISSIONS.DASHBOARD_ACCESS,
    PERMISSIONS.MENU_READ, PERMISSIONS.ORDERS_READ, PERMISSIONS.ROOMS_READ,
    PERMISSIONS.BOOKINGS_READ, PERMISSIONS.INVENTORY_READ, PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.REPORTS_READ,
  ],
}

// Admin dashboard route → required permission mapping
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/admin/dashboard':   PERMISSIONS.DASHBOARD_ACCESS,
  '/admin/pos':         PERMISSIONS.POS_ACCESS,
  '/admin/orders':      PERMISSIONS.ORDERS_READ,
  '/admin/kitchen':     PERMISSIONS.KITCHEN_ACCESS,
  '/admin/menu':        PERMISSIONS.MENU_READ,
  '/admin/tables':      PERMISSIONS.TABLES_READ,
  '/admin/inventory':   PERMISSIONS.INVENTORY_READ,
  '/admin/suppliers':   PERMISSIONS.INVENTORY_READ,
  '/admin/purchase-orders': PERMISSIONS.INVENTORY_READ,
  '/admin/rooms':       PERMISSIONS.ROOMS_READ,
  '/admin/pool':        PERMISSIONS.POOL_ACCESS,
  '/admin/bookings':    PERMISSIONS.BOOKINGS_READ,
  '/admin/customers':   PERMISSIONS.CUSTOMERS_READ,
  '/admin/employees':   PERMISSIONS.EMPLOYEES_READ,
  '/admin/reports':     PERMISSIONS.REPORTS_READ,
  '/admin/settings':    PERMISSIONS.SETTINGS_READ,
  '/admin/users':       PERMISSIONS.USERS_MANAGE,
}
