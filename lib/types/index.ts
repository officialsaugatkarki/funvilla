// Re-export all types from database
export * from './database'

// App-specific composite types that don't map 1:1 to a DB table

export interface AuthUser {
  id: string
  email: string | null
  profile: import('./database').Profile
  roles: import('./database').UserRole[]
  permissions: string[]
  restaurantId: string
}

export interface SessionUser {
  id: string
  email: string
  restaurantId: string
  roleName: import('./database').RoleName
  permissions: string[]
}
