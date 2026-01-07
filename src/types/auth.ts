// Authentication and authorization types

export const USER_ROLES = [
  'super_admin',
  'owner',
  'admin',
  'manager',
  'member',
  'viewer',
] as const

export type UserRole = (typeof USER_ROLES)[number]

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  member: 1,
  manager: 2,
  admin: 3,
  owner: 4,
  super_admin: 5,
}

export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  role: UserRole
  is_active: boolean
  email_verified: boolean
  two_factor_enabled: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  created_at: string
}

// Permission categories
export const PERMISSION_CATEGORIES = [
  'quotes',
  'inland_quotes',
  'customers',
  'equipment',
  'rates',
  'settings',
  'users',
  'reports',
  'audit',
] as const

export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[number]

// Actions per category
export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'export'] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export type Permission = `${PermissionCategory}:${PermissionAction}`

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: [
    'quotes:view',
    'inland_quotes:view',
    'customers:view',
    'equipment:view',
  ],
  member: [
    'quotes:view',
    'quotes:create',
    'quotes:edit',
    'inland_quotes:view',
    'inland_quotes:create',
    'inland_quotes:edit',
    'customers:view',
    'customers:create',
    'customers:edit',
    'equipment:view',
    'rates:view',
  ],
  manager: [
    'quotes:view',
    'quotes:create',
    'quotes:edit',
    'quotes:delete',
    'quotes:export',
    'inland_quotes:view',
    'inland_quotes:create',
    'inland_quotes:edit',
    'inland_quotes:delete',
    'inland_quotes:export',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:delete',
    'customers:export',
    'equipment:view',
    'equipment:create',
    'equipment:edit',
    'rates:view',
    'rates:edit',
    'reports:view',
  ],
  admin: [
    'quotes:view',
    'quotes:create',
    'quotes:edit',
    'quotes:delete',
    'quotes:export',
    'inland_quotes:view',
    'inland_quotes:create',
    'inland_quotes:edit',
    'inland_quotes:delete',
    'inland_quotes:export',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:delete',
    'customers:export',
    'equipment:view',
    'equipment:create',
    'equipment:edit',
    'equipment:delete',
    'rates:view',
    'rates:create',
    'rates:edit',
    'rates:delete',
    'settings:view',
    'settings:edit',
    'users:view',
    'users:create',
    'users:edit',
    'reports:view',
    'reports:export',
    'audit:view',
  ],
  owner: [
    'quotes:view',
    'quotes:create',
    'quotes:edit',
    'quotes:delete',
    'quotes:export',
    'inland_quotes:view',
    'inland_quotes:create',
    'inland_quotes:edit',
    'inland_quotes:delete',
    'inland_quotes:export',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:delete',
    'customers:export',
    'equipment:view',
    'equipment:create',
    'equipment:edit',
    'equipment:delete',
    'rates:view',
    'rates:create',
    'rates:edit',
    'rates:delete',
    'settings:view',
    'settings:edit',
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'reports:view',
    'reports:export',
    'audit:view',
    'audit:export',
  ],
  super_admin: [
    'quotes:view',
    'quotes:create',
    'quotes:edit',
    'quotes:delete',
    'quotes:export',
    'inland_quotes:view',
    'inland_quotes:create',
    'inland_quotes:edit',
    'inland_quotes:delete',
    'inland_quotes:export',
    'customers:view',
    'customers:create',
    'customers:edit',
    'customers:delete',
    'customers:export',
    'equipment:view',
    'equipment:create',
    'equipment:edit',
    'equipment:delete',
    'rates:view',
    'rates:create',
    'rates:edit',
    'rates:delete',
    'settings:view',
    'settings:edit',
    'users:view',
    'users:create',
    'users:edit',
    'users:delete',
    'reports:view',
    'reports:export',
    'audit:view',
    'audit:export',
  ],
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}
