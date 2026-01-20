import { describe, it, expect, vi } from 'vitest'
import { quotesRouter } from '../quotes'
import { createMockUser, TEST_UUID } from '@/test/trpc-helpers'
import type { User } from '@/types/auth'

// Test quote data
const TEST_QUOTE = {
  id: TEST_UUID.quote,
  quote_number: 'QT-2026-001',
  version: 1,
  status: 'draft' as const,
  customer_name: 'Test Customer',
  customer_company: 'Test Company Inc',
  customer_email: 'customer@example.com',
  make_name: 'Caterpillar',
  model_name: 'D6T',
  location: 'Houston' as const,
  total: 15000,
  subtotal: 14000,
  quote_data: { items: [] },
  public_token: TEST_UUID.default,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_latest_version: true,
}

// Helper to create a caller with mocked context
function createTestContext(user: User | null, supabaseMocks: Record<string, unknown> = {}) {
  const defaultMocks = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
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
  }

  return {
    user,
    supabase: { ...defaultMocks, ...supabaseMocks },
  }
}

// Helper to create router caller
function createCaller(ctx: ReturnType<typeof createTestContext>) {
  return quotesRouter.createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
}

describe('Quotes Router', () => {
  describe('getHistory', () => {
    it('allows authenticated users to list quotes', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockQuotes = [TEST_QUOTE]

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockQuotes, error: null, count: 1 }),
            }),
          }),
        }),
      })

      // Mock without status filter
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: mockQuotes, error: null, count: 1 }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.getHistory({ limit: 20, offset: 0 })

      expect(result.quotes).toEqual(mockQuotes)
      expect(result.total).toBe(1)
    })

    it('allows filtering by status', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const sentQuotes = [{ ...TEST_QUOTE, status: 'sent' }]

      const mockRange = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: sentQuotes, error: null, count: 1 }),
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

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.getHistory({ limit: 20, offset: 0, status: 'sent' })

      expect(result.quotes).toHaveLength(1)
      expect(result.quotes?.[0]?.status).toBe('sent')
    })
  })

  describe('getById', () => {
    it('allows authenticated users to get a specific quote', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: TEST_QUOTE, error: null }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.getById({ id: TEST_UUID.quote })

      expect(result).toEqual(TEST_QUOTE)
    })
  })

  describe('getByPublicToken', () => {
    it('allows public access without authentication', async () => {
      // No user - public access
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: TEST_QUOTE, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })

      const ctx = {
        user: null,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.getByPublicToken({ token: TEST_UUID.default })

      expect(result).toEqual(TEST_QUOTE)
    })

    it('returns null for invalid token', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          }),
        }),
      })

      const ctx = {
        user: null,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.getByPublicToken({ token: TEST_UUID.otherUser })

      expect(result).toBeNull()
    })

    it('marks quote as viewed when customer accesses sent quote', async () => {
      const sentQuote = { ...TEST_QUOTE, status: 'sent' as const }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'quote_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: sentQuote, error: null }),
              }),
            }),
            update: mockUpdate,
          }
        }
        if (table === 'quote_status_history') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {}
      })

      const ctx = {
        user: null,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.getByPublicToken({ token: TEST_UUID.default })

      // Should have updated status to viewed
      expect(mockUpdate).toHaveBeenCalled()
      expect(result?.status).toBe('viewed')
    })
  })

  describe('create', () => {
    it('allows authenticated users to create quotes', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const newQuote = {
        ...TEST_QUOTE,
        id: TEST_UUID.assignee,
        created_by: TEST_UUID.member,
      }

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newQuote, error: null }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.create({
        quote_number: 'QT-2026-001',
        status: 'draft',
        customer_name: 'Test Customer',
        make_name: 'Caterpillar',
        model_name: 'D6T',
        location: 'Houston',
        total: 15000,
        subtotal: 14000,
        quote_data: { items: [] },
      })

      expect(result).toEqual(newQuote)
    })

    it('associates created quote with the authenticated user', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...TEST_QUOTE, created_by: TEST_UUID.member },
            error: null,
          }),
        }),
      })

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      await caller.create({
        quote_number: 'QT-2026-001',
        status: 'draft',
        customer_name: 'Test Customer',
        make_name: 'Caterpillar',
        model_name: 'D6T',
        location: 'Houston',
        total: 15000,
        subtotal: 14000,
        quote_data: { items: [] },
      })

      // Check that insert was called with created_by = user.id
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by: TEST_UUID.member,
        })
      )
    })
  })

  describe('update', () => {
    it('allows authenticated users to update quotes', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const updatedQuote = { ...TEST_QUOTE, customer_name: 'Updated Customer' }

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedQuote, error: null }),
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.update({
        id: TEST_UUID.quote,
        data: { customer_name: 'Updated Customer' },
      })

      expect(result?.customer_name).toBe('Updated Customer')
    })
  })

  describe('delete', () => {
    it('allows authenticated users to delete quotes', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.delete({ id: TEST_UUID.quote })

      expect(result).toEqual({ success: true })
    })
  })

  describe('generateNumber', () => {
    it('generates quote number with prefix from settings', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { quote_prefix: 'DQ' },
            error: null,
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.generateNumber()

      // Should start with the prefix
      expect(result).toMatch(/^DQ-/)
    })

    it('uses default prefix when settings not found', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.generateNumber()

      // Should use default prefix QT
      expect(result).toMatch(/^QT-/)
    })
  })

  describe('updateStatus', () => {
    it('allows authenticated users to update quote status', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'quote_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...TEST_QUOTE, status: 'draft' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...TEST_QUOTE, status: 'sent' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { first_name: 'Test', last_name: 'User' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'quote_status_history') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {}
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.updateStatus({
        id: TEST_UUID.quote,
        status: 'sent',
      })

      expect(result?.status).toBe('sent')
    })

    it('records status change in history', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockHistoryInsert = vi.fn().mockResolvedValue({ data: null, error: null })

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'quote_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...TEST_QUOTE, status: 'draft' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...TEST_QUOTE, status: 'sent' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { first_name: 'Test', last_name: 'User' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'quote_status_history') {
          return {
            insert: mockHistoryInsert,
          }
        }
        return {}
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      await caller.updateStatus({
        id: TEST_UUID.quote,
        status: 'sent',
        notes: 'Sent to customer',
      })

      // Should have recorded history
      expect(mockHistoryInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          quote_id: TEST_UUID.quote,
          previous_status: 'draft',
          new_status: 'sent',
          notes: 'Sent to customer',
        })
      )
    })
  })

  describe('getPublicLink', () => {
    it('returns existing public token', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { public_token: TEST_UUID.default },
              error: null,
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.getPublicLink({ id: TEST_UUID.quote })

      expect(result.token).toBe(TEST_UUID.default)
    })

    it('generates new token if none exists', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { public_token: null },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.getPublicLink({ id: TEST_UUID.quote })

      // Should return a valid UUID token
      expect(result.token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })
  })

  describe('regeneratePublicToken', () => {
    it('generates a new public token', async () => {
      const memberUser = createMockUser({ id: TEST_UUID.member, role: 'member' })

      const newToken = TEST_UUID.assignee

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { public_token: newToken },
                error: null,
              }),
            }),
          }),
        }),
      })

      const ctx = {
        user: memberUser,
        supabase: { from: mockFrom },
      }

      const caller = createCaller(ctx as Parameters<typeof quotesRouter.createCaller>[0])
      const result = await caller.regeneratePublicToken({ id: TEST_UUID.quote })

      expect(result.token).toBe(newToken)
    })
  })
})
