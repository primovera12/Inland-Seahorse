import { describe, it, expect, vi } from 'vitest'
import { TRPCError } from '@trpc/server'
import { settingsRouter } from '../settings'
import { createMockUser, TEST_UUID } from '@/test/trpc-helpers'
import type { User } from '@/types/auth'

// Helper to create a caller with mocked context
function createTestContext(user: User | null, supabaseMocks: Record<string, unknown> = {}) {
  const defaultMocks = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      }),
    }),
  }

  return {
    user,
    supabase: { ...defaultMocks, ...supabaseMocks },
  }
}

// Helper to create router caller
function createCaller(ctx: ReturnType<typeof createTestContext>) {
  return settingsRouter.createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
}

describe('Settings Router', () => {
  describe('get', () => {
    it('allows authenticated users to read settings', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockSettings = {
        id: TEST_UUID.default,
        company_name: 'Test Company',
        primary_color: '#6366F1',
      }

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.get()

      expect(result).toEqual(mockSettings)
    })

    it('returns null when no settings exist', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
              }),
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.get()

      expect(result).toBeNull()
    })
  })

  describe('update', () => {
    it('throws FORBIDDEN when member tries to update', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const ctx = createTestContext(memberUser)
      const caller = createCaller(ctx)

      await expect(
        caller.update({ company_name: 'New Name' })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws FORBIDDEN when viewer tries to update', async () => {
      const viewerUser = createMockUser({ id: TEST_UUID.viewer, role: 'viewer' })

      const ctx = createTestContext(viewerUser)
      const caller = createCaller(ctx)

      await expect(
        caller.update({ company_name: 'New Name' })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('allows admin to update settings', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: TEST_UUID.default, terms_version: 1 },
                error: null,
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: TEST_UUID.default, company_name: 'Updated Company' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const ctx = {
        user: adminUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.update({ company_name: 'Updated Company' })

      expect(result).toEqual({ id: TEST_UUID.default, company_name: 'Updated Company' })
    })

    it('allows super_admin to update settings', async () => {
      const superAdminUser = createMockUser({ id: TEST_UUID.superAdmin, role: 'super_admin' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: TEST_UUID.default, terms_version: 1 },
                error: null,
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: TEST_UUID.default, company_name: 'Super Admin Update' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const ctx = {
        user: superAdminUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.update({ company_name: 'Super Admin Update' })

      expect(result).toEqual({ id: TEST_UUID.default, company_name: 'Super Admin Update' })
    })

    it('allows owner to update settings', async () => {
      const ownerUser = createMockUser({ id: TEST_UUID.owner, role: 'owner' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: TEST_UUID.default, terms_version: 1 },
                error: null,
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: TEST_UUID.default, company_name: 'Owner Update' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const ctx = {
        user: ownerUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.update({ company_name: 'Owner Update' })

      expect(result).toEqual({ id: TEST_UUID.default, company_name: 'Owner Update' })
    })
  })

  describe('getTerms', () => {
    it('allows authenticated users to read terms', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { terms_dismantle: 'Test terms content', terms_version: 2 },
            error: null,
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.getTerms({ type: 'dismantle' })

      expect(result).toEqual({ content: 'Test terms content', version: 2 })
    })
  })

  describe('updateTerms', () => {
    it('throws FORBIDDEN when member tries to update terms', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const ctx = createTestContext(memberUser)
      const caller = createCaller(ctx)

      await expect(
        caller.updateTerms({ type: 'dismantle', content: 'New terms' })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('allows admin to update terms', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEST_UUID.default, terms_version: 1 },
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { terms_dismantle: 'Updated terms', terms_version: 2 },
                error: null,
              }),
            }),
          }),
        }),
      })

      const ctx = {
        user: adminUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.updateTerms({ type: 'dismantle', content: 'Updated terms' })

      expect(result).toEqual({ success: true, version: 2 })
    })
  })

  describe('getPopularMakes', () => {
    it('allows authenticated users to read popular makes', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockMakes = ['Caterpillar', 'Komatsu', 'John Deere']

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { popular_makes: mockMakes },
              error: null,
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.getPopularMakes()

      expect(result).toEqual(mockMakes)
    })

    it('returns default makes when no settings exist', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.getPopularMakes()

      // Should return default makes
      expect(result).toContain('Caterpillar')
      expect(result).toContain('Komatsu')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('updatePopularMakes', () => {
    it('throws FORBIDDEN when member tries to update popular makes', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const ctx = createTestContext(memberUser)
      const caller = createCaller(ctx)

      await expect(
        caller.updatePopularMakes({ makes: ['Brand1', 'Brand2'] })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws FORBIDDEN when manager tries to update popular makes', async () => {
      const managerUser = createMockUser({ id: TEST_UUID.manager, role: 'manager' })

      const ctx = createTestContext(managerUser)
      const caller = createCaller(ctx)

      await expect(
        caller.updatePopularMakes({ makes: ['Brand1', 'Brand2'] })
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('allows admin to update popular makes', async () => {
      const adminUser = createMockUser({ id: TEST_UUID.admin, role: 'admin' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: TEST_UUID.default },
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })

      const ctx = {
        user: adminUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof settingsRouter.createCaller>[0])
      const result = await caller.updatePopularMakes({ makes: ['Brand1', 'Brand2'] })

      expect(result).toEqual({ success: true })
    })
  })
})
