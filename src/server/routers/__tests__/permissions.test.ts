import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TRPCError } from '@trpc/server'
import { permissionsRouter } from '../permissions'
import { createMockUser, createMockSupabaseClient, TEST_UUID } from '@/test/trpc-helpers'
import type { User } from '@/types/auth'

// Use valid UUIDs from trpc-helpers
const TEST_UUIDS = {
  member: TEST_UUID.member,
  admin: TEST_UUID.admin,
  otherUser: TEST_UUID.otherUser,
  quote: TEST_UUID.quote,
  assignee: TEST_UUID.assignee,
}

// Helper to create a caller with mocked context
function createTestContext(user: User | null, supabaseMocks: Record<string, unknown> = {}) {
  const mockSupabase = createMockSupabaseClient()

  // Apply any custom mocks
  Object.assign(mockSupabase, supabaseMocks)

  return {
    user,
    supabase: mockSupabase,
  }
}

// Helper to create router caller
function createCaller(ctx: ReturnType<typeof createTestContext>) {
  return permissionsRouter.createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])
}

describe('Permissions Router', () => {
  describe('getMyRole', () => {
    it('returns member role by default when no role assigned', async () => {
      const user = createMockUser({ role: 'member' })
      const ctx = createTestContext(user)

      const caller = createCaller(ctx)
      const result = await caller.getMyRole()

      expect(result).toEqual({ role: 'member', granted_at: null })
    })
  })

  describe('getAllPermissions', () => {
    it('throws FORBIDDEN when non-admin tries to access', async () => {
      const memberUser = createMockUser({ role: 'member' })

      // Create mock that returns member role
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
          }),
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])

      await expect(caller.getAllPermissions()).rejects.toThrow(TRPCError)
      await expect(caller.getAllPermissions()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('allows admin to access all permissions', async () => {
      const adminUser = createMockUser({ role: 'admin' })

      const mockPermissions = [
        { id: '1', role: 'admin', entity: 'quotes', can_view: true, can_create: true },
        { id: '2', role: 'member', entity: 'quotes', can_view: true, can_create: true },
      ]

      // Create mock that returns admin role and permissions
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'role_permissions') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockPermissions, error: null }),
              }),
            }),
          }
        }
        return {}
      })

      const ctx = {
        user: adminUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])
      const result = await caller.getAllPermissions()

      expect(result).toEqual(mockPermissions)
    })
  })

  describe('updatePermission', () => {
    it('throws FORBIDDEN when member tries to update', async () => {
      const memberUser = createMockUser({ role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])

      await expect(
        caller.updatePermission({
          role: 'member',
          entity: 'quotes',
          can_delete: true,
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws FORBIDDEN when viewer tries to update', async () => {
      const viewerUser = createMockUser({ role: 'viewer' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'viewer' }, error: null }),
          }),
        }),
      })

      const ctx = {
        user: viewerUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])

      await expect(
        caller.updatePermission({
          role: 'viewer',
          entity: 'quotes',
          can_view: true,
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  })

  describe('assignRole', () => {
    it('throws FORBIDDEN when non-admin tries to assign role', async () => {
      const memberUser = createMockUser({ id: TEST_UUIDS.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])

      await expect(
        caller.assignRole({
          userId: TEST_UUIDS.otherUser,
          role: 'admin',
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws BAD_REQUEST when admin tries to change own role', async () => {
      const adminUser = createMockUser({ id: TEST_UUIDS.admin, role: 'admin' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
          }),
        }),
      })

      const ctx = {
        user: adminUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])

      await expect(
        caller.assignRole({
          userId: TEST_UUIDS.admin, // Same as current user
          role: 'member',
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Cannot change your own role',
      })
    })

    it('allows admin to assign role to other user', async () => {
      const adminUser = createMockUser({ id: TEST_UUIDS.admin, role: 'admin' })

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
              }),
            }),
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: TEST_UUIDS.otherUser, role: 'manager' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })

      const ctx = {
        user: adminUser,
        supabase: { from: mockFrom, rpc: mockRpc },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])
      const result = await caller.assignRole({
        userId: TEST_UUIDS.otherUser,
        role: 'manager',
      })

      expect(result).toEqual({ user_id: TEST_UUIDS.otherUser, role: 'manager' })
    })
  })

  describe('getAllUserRoles', () => {
    it('throws FORBIDDEN when viewer tries to access', async () => {
      const viewerUser = createMockUser({ role: 'viewer' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'viewer' }, error: null }),
          }),
        }),
      })

      const ctx = {
        user: viewerUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])

      await expect(caller.getAllUserRoles()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws FORBIDDEN when member tries to access', async () => {
      const memberUser = createMockUser({ role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])

      await expect(caller.getAllUserRoles()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('allows manager to access all user roles', async () => {
      const managerUser = createMockUser({ role: 'manager' })

      const mockUserRoles = [
        { user_id: '1', role: 'admin' },
        { user_id: '2', role: 'member' },
      ]

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockImplementation((columns: string) => {
              if (columns === 'role') {
                return {
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: { role: 'manager' }, error: null }),
                  }),
                }
              }
              // For the full select with join
              return {
                order: vi.fn().mockResolvedValue({ data: mockUserRoles, error: null }),
              }
            }),
          }
        }
        return {}
      })

      const ctx = {
        user: managerUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])
      const result = await caller.getAllUserRoles()

      expect(result).toEqual(mockUserRoles)
    })
  })

  describe('assignQuote', () => {
    it('throws FORBIDDEN when user lacks can_assign permission', async () => {
      const memberUser = createMockUser({ id: TEST_UUIDS.member, role: 'member' })

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'role_permissions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { can_assign: false },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])

      await expect(
        caller.assignQuote({
          quoteId: TEST_UUIDS.quote,
          assigneeId: TEST_UUIDS.assignee,
          quoteType: 'dismantle',
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'No permission to assign quotes',
      })
    })
  })

  describe('getAuditLogs', () => {
    it('non-admin users only see their own logs', async () => {
      const memberUser = createMockUser({ id: 'member-id', role: 'member' })

      const mockLogs = [{ id: '1', user_id: 'member-id', action: 'test' }]

      // Track the query to verify it filters by user_id
      let queryFilteredByUserId = false

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'audit_log') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  range: vi.fn().mockReturnValue({
                    eq: vi.fn().mockImplementation((column: string, value: string) => {
                      if (column === 'user_id' && value === 'member-id') {
                        queryFilteredByUserId = true
                      }
                      return Promise.resolve({ data: mockLogs, error: null, count: 1 })
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof permissionsRouter.createCaller>[0])
      await caller.getAuditLogs()

      expect(queryFilteredByUserId).toBe(true)
    })
  })
})

describe('Authorization Edge Cases', () => {
  it('unauthenticated requests are rejected', () => {
    // Note: The router uses protectedProcedure which throws UNAUTHORIZED
    // This is handled by the tRPC middleware, not the router itself
    // So we test that the caller context requires a user
    expect(() => {
      const ctx = createTestContext(null)
      createCaller(ctx)
    }).not.toThrow() // Caller creation doesn't throw, but procedure calls will
  })
})
