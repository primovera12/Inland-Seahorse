/**
 * tRPC Test Helpers
 *
 * Utilities for testing tRPC routers with mocked user contexts
 * for different roles (admin, member, viewer, etc.)
 */

import type { User, UserRole } from '@/types/auth'

// Valid UUID format for testing (RFC 4122 compliant)
// Format: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx where M=version(1-8), N=variant(8,9,a,b)
export const TEST_UUID = {
  default: '00000000-0000-4000-a000-000000000000',
  superAdmin: '00000000-0000-4000-a000-000000000001',
  owner: '00000000-0000-4000-a000-000000000002',
  admin: '00000000-0000-4000-a000-000000000003',
  manager: '00000000-0000-4000-a000-000000000004',
  member: '00000000-0000-4000-a000-000000000005',
  viewer: '00000000-0000-4000-a000-000000000006',
  otherUser: '00000000-0000-4000-a000-000000000099',
  quote: '00000000-0000-4000-a000-000000000100',
  assignee: '00000000-0000-4000-a000-000000000101',
}

// Mock user factory - creates a user with specified role and optional overrides
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: TEST_UUID.default,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'member',
    is_active: true,
    email_verified: true,
    two_factor_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Create a mock user with a specific role
export function createMockUserWithRole(role: UserRole): User {
  return createMockUser({ role })
}

// Predefined mock users for each role
export const mockUsers = {
  superAdmin: createMockUser({
    id: TEST_UUID.superAdmin,
    email: 'superadmin@example.com',
    role: 'super_admin',
    first_name: 'Super',
    last_name: 'Admin',
  }),
  owner: createMockUser({
    id: TEST_UUID.owner,
    email: 'owner@example.com',
    role: 'owner',
    first_name: 'Owner',
    last_name: 'User',
  }),
  admin: createMockUser({
    id: TEST_UUID.admin,
    email: 'admin@example.com',
    role: 'admin',
    first_name: 'Admin',
    last_name: 'User',
  }),
  manager: createMockUser({
    id: TEST_UUID.manager,
    email: 'manager@example.com',
    role: 'manager',
    first_name: 'Manager',
    last_name: 'User',
  }),
  member: createMockUser({
    id: TEST_UUID.member,
    email: 'member@example.com',
    role: 'member',
    first_name: 'Member',
    last_name: 'User',
  }),
  viewer: createMockUser({
    id: TEST_UUID.viewer,
    email: 'viewer@example.com',
    role: 'viewer',
    first_name: 'Viewer',
    last_name: 'User',
  }),
}

// Mock Supabase client for testing
export function createMockSupabaseClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
        order: () => ({
          limit: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  }
}

// Create a mock context for tRPC testing
export function createMockContext(user: User | null = null) {
  return {
    user,
    supabase: createMockSupabaseClient(),
  }
}

// Create mock context with specific role
export function createMockContextWithRole(role: UserRole) {
  return createMockContext(createMockUserWithRole(role))
}

// Helper to test that a procedure throws UNAUTHORIZED
export async function expectUnauthorized(fn: () => Promise<unknown>) {
  try {
    await fn()
    throw new Error('Expected UNAUTHORIZED error but none was thrown')
  } catch (error: unknown) {
    const trpcError = error as { code?: string }
    if (trpcError.code !== 'UNAUTHORIZED') {
      throw new Error(`Expected UNAUTHORIZED but got: ${trpcError.code}`)
    }
  }
}

// Helper to test that a procedure throws FORBIDDEN
export async function expectForbidden(fn: () => Promise<unknown>) {
  try {
    await fn()
    throw new Error('Expected FORBIDDEN error but none was thrown')
  } catch (error: unknown) {
    const trpcError = error as { code?: string }
    if (trpcError.code !== 'FORBIDDEN') {
      throw new Error(`Expected FORBIDDEN but got: ${trpcError.code}`)
    }
  }
}

// Helper to test role-based access
export function testRoleAccess(
  allowedRoles: UserRole[],
  allRoles: UserRole[] = ['super_admin', 'owner', 'admin', 'manager', 'member', 'viewer']
) {
  const deniedRoles = allRoles.filter((role) => !allowedRoles.includes(role))
  return { allowedRoles, deniedRoles }
}
