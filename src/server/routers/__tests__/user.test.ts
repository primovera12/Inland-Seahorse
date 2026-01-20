import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userRouter } from '../user'
import { createMockUser, TEST_UUID } from '@/test/trpc-helpers'
import type { User } from '@/types/auth'

// Mock the admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: TEST_UUID.otherUser } },
          error: null,
        }),
      },
    },
  })),
}))

// Test user data
const TEST_USER = {
  id: TEST_UUID.member,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'member' as const,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// Helper to create a caller with mocked context
function createTestContext(user: User | null, supabaseMocks: Record<string, unknown> = {}) {
  const defaultMocks = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
          or: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        }),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  }

  return {
    user,
    supabase: { ...defaultMocks, ...supabaseMocks },
  }
}

// Helper to create router caller
function createCaller(ctx: ReturnType<typeof createTestContext>) {
  return userRouter.createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
}

describe('User Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('me', () => {
    it('returns the current authenticated user', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const ctx = createTestContext(memberUser)
      const caller = createCaller(ctx)
      const result = await caller.me()

      expect(result).toEqual(memberUser)
    })

    it('returns user with all their details', async () => {
      const adminUser = createMockUser({
        id: TEST_UUID.admin,
        email: 'admin@example.com',
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
      })

      const ctx = createTestContext(adminUser)
      const caller = createCaller(ctx)
      const result = await caller.me()

      expect(result.id).toBe(TEST_UUID.admin)
      expect(result.email).toBe('admin@example.com')
      expect(result.role).toBe('admin')
      expect(result.first_name).toBe('Admin')
    })
  })

  describe('updateProfile', () => {
    it('allows user to update their own profile', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const updatedProfile = {
        ...TEST_USER,
        first_name: 'Updated',
        last_name: 'Name',
      }

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
      const result = await caller.updateProfile({
        first_name: 'Updated',
        last_name: 'Name',
      })

      expect(result?.first_name).toBe('Updated')
      expect(result?.last_name).toBe('Name')
    })

    it('updates only specified fields', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { ...TEST_USER, first_name: 'NewFirst' },
              error: null,
            }),
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
      await caller.updateProfile({ first_name: 'NewFirst' })

      // Verify update was called with only first_name
      expect(mockUpdate).toHaveBeenCalledWith({ first_name: 'NewFirst' })
    })

    it('scopes update to current user ID only', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockEq = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: TEST_USER, error: null }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
      await caller.updateProfile({ first_name: 'Test' })

      // Verify that eq was called with the current user's ID
      expect(mockEq).toHaveBeenCalledWith('id', TEST_UUID.member)
    })
  })

  describe('getTeamMembers', () => {
    it('returns list of team members', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const teamMembers = [
        { ...TEST_USER, id: TEST_UUID.member },
        { ...TEST_USER, id: TEST_UUID.admin, email: 'admin@example.com', role: 'admin' },
      ]

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: teamMembers,
              error: null,
              count: 2,
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
      const result = await caller.getTeamMembers({ limit: 50, offset: 0 })

      expect(result.users).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('supports search filtering', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockOr = vi.fn().mockResolvedValue({
        data: [TEST_USER],
        error: null,
        count: 1,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              or: mockOr,
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
      await caller.getTeamMembers({ limit: 50, offset: 0, search: 'test' })

      // Verify search filter was applied
      expect(mockOr).toHaveBeenCalledWith(
        expect.stringContaining('first_name.ilike.%test%')
      )
    })

    it('supports pagination', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockRange = vi.fn().mockResolvedValue({
        data: [TEST_USER],
        error: null,
        count: 100,
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: mockRange,
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
      await caller.getTeamMembers({ limit: 10, offset: 20 })

      // Verify pagination was applied
      expect(mockRange).toHaveBeenCalledWith(20, 29)
    })
  })

  describe('inviteTeamMember', () => {
    it('throws FORBIDDEN when member tries to invite', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const ctx = createTestContext(memberUser)
      const caller = createCaller(ctx)

      await expect(
        caller.inviteTeamMember({
          email: 'newuser@example.com',
          first_name: 'New',
          last_name: 'User',
          role: 'member',
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('creates a new user with invited status', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const newUser = {
        id: TEST_UUID.otherUser,
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'member',
        status: 'invited',
      }

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newUser, error: null }),
          }),
        }),
      })

      const ctx = {
        user: adminUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
      const result = await caller.inviteTeamMember({
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'member',
      })

      expect(result).toEqual(newUser)
    })

    it('includes invited status in insert', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      })

      const ctx = {
        user: adminUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
      await caller.inviteTeamMember({
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'member',
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'invited',
        })
      )
    })
  })

  describe('updateRole', () => {
    it('throws FORBIDDEN when member tries to update role', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const ctx = createTestContext(memberUser)
      const caller = createCaller(ctx)

      await expect(
        caller.updateRole({
          userId: TEST_UUID.otherUser,
          role: 'admin',
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws BAD_REQUEST when admin tries to change own role', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const ctx = createTestContext(adminUser)
      const caller = createCaller(ctx)

      await expect(
        caller.updateRole({
          userId: TEST_UUID.admin, // Same as current user
          role: 'member',
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Cannot change your own role',
      })
    })

    it('updates user role', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      // Reset and setup the mock for createAdminClient
      const { createAdminClient } = await import('@/lib/supabase/admin')
      ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...TEST_USER, role: 'manager' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const ctx = createTestContext(adminUser)
      const caller = createCaller(ctx)
      const result = await caller.updateRole({
        userId: TEST_UUID.otherUser,
        role: 'manager',
      })

      expect(result?.role).toBe('manager')
    })
  })

  describe('updateStatus', () => {
    it('throws FORBIDDEN when member tries to update status', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const ctx = createTestContext(memberUser)
      const caller = createCaller(ctx)

      await expect(
        caller.updateStatus({
          userId: TEST_UUID.otherUser,
          status: 'inactive',
        })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws BAD_REQUEST when admin tries to deactivate self', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const ctx = createTestContext(adminUser)
      const caller = createCaller(ctx)

      await expect(
        caller.updateStatus({
          userId: TEST_UUID.admin, // Same as current user
          status: 'inactive',
        })
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Cannot deactivate your own account',
      })
    })

    it('updates user status', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const { createAdminClient } = await import('@/lib/supabase/admin')
      ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...TEST_USER, status: 'inactive' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const ctx = createTestContext(adminUser)
      const caller = createCaller(ctx)
      const result = await caller.updateStatus({
        userId: TEST_UUID.otherUser,
        status: 'inactive',
      })

      expect(result?.status).toBe('inactive')
    })
  })

  describe('removeTeamMember', () => {
    it('throws FORBIDDEN when member tries to remove team member', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const ctx = createTestContext(memberUser)
      const caller = createCaller(ctx)

      await expect(
        caller.removeTeamMember({ userId: TEST_UUID.otherUser })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws BAD_REQUEST when admin tries to delete self', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const ctx = createTestContext(adminUser)
      const caller = createCaller(ctx)

      await expect(
        caller.removeTeamMember({ userId: TEST_UUID.admin }) // Same as current user
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Cannot delete your own account',
      })
    })

    it('removes a team member', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const { createAdminClient } = await import('@/lib/supabase/admin')
      ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      const ctx = createTestContext(adminUser)
      const caller = createCaller(ctx)
      const result = await caller.removeTeamMember({ userId: TEST_UUID.otherUser })

      expect(result).toEqual({ success: true })
    })
  })

  describe('changePassword', () => {
    it('changes password when current password is correct', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockAuth = {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
      }

      const ctx = {
        user: memberUser,
        supabase: {
          from: vi.fn(),
          auth: mockAuth,
        },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])
      const result = await caller.changePassword({
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      })

      expect(result).toEqual({ success: true })
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: memberUser.email,
        password: 'oldpassword',
      })
      expect(mockAuth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      })
    })

    it('throws error when current password is incorrect', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockAuth = {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { message: 'Invalid credentials' },
        }),
        updateUser: vi.fn(),
      }

      const ctx = {
        user: memberUser,
        supabase: {
          from: vi.fn(),
          auth: mockAuth,
        },
      }

      const caller = createCaller(ctx as Parameters<typeof userRouter.createCaller>[0])

      await expect(
        caller.changePassword({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        })
      ).rejects.toThrow('Current password is incorrect')

      // Verify updateUser was not called
      expect(mockAuth.updateUser).not.toHaveBeenCalled()
    })

    it('validates minimum password length', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const ctx = createTestContext(memberUser)
      const caller = createCaller(ctx)

      await expect(
        caller.changePassword({
          currentPassword: 'oldpass',
          newPassword: 'short', // Less than 8 characters
        })
      ).rejects.toThrow()
    })
  })

  describe('updateTeamMember', () => {
    it('updates team member details', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const { createAdminClient } = await import('@/lib/supabase/admin')
      ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    ...TEST_USER,
                    id: TEST_UUID.otherUser,
                    first_name: 'Updated',
                    last_name: 'Member',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const ctx = createTestContext(adminUser)
      const caller = createCaller(ctx)
      const result = await caller.updateTeamMember({
        userId: TEST_UUID.otherUser,
        first_name: 'Updated',
        last_name: 'Member',
      })

      expect(result?.first_name).toBe('Updated')
      expect(result?.last_name).toBe('Member')
    })

    it('filters out undefined values', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: TEST_USER, error: null }),
          }),
        }),
      })

      const { createAdminClient } = await import('@/lib/supabase/admin')
      ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: mockUpdate,
        }),
      })

      const ctx = createTestContext(adminUser)
      const caller = createCaller(ctx)
      await caller.updateTeamMember({
        userId: TEST_UUID.otherUser,
        first_name: 'OnlyThis',
        // last_name, email, role are undefined
      })

      // Should only include first_name (undefined values filtered out)
      expect(mockUpdate).toHaveBeenCalledWith({ first_name: 'OnlyThis' })
    })
  })
})
