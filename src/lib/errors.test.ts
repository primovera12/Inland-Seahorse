import { describe, it, expect } from 'vitest'
import { TRPCError } from '@trpc/server'
import type { PostgrestError } from '@supabase/supabase-js'
import {
  handleSupabaseError,
  checkSupabaseError,
  assertDataExists,
  sanitizeErrorMessage,
} from './errors'

// Helper to create a mock PostgrestError
function createPostgrestError(
  code: string,
  message = 'Test error'
): PostgrestError {
  return {
    code,
    message,
    details: '',
    hint: '',
  }
}

describe('handleSupabaseError', () => {
  it('throws TRPCError with NOT_FOUND for PGRST116', () => {
    const error = createPostgrestError('PGRST116')

    expect(() => handleSupabaseError(error, 'Quote')).toThrow(TRPCError)

    try {
      handleSupabaseError(error, 'Quote')
    } catch (e) {
      const trpcError = e as TRPCError
      expect(trpcError.code).toBe('NOT_FOUND')
      expect(trpcError.message).toBe('Quote not found')
    }
  })

  it('throws TRPCError with CONFLICT for unique violation', () => {
    const error = createPostgrestError('23505')

    try {
      handleSupabaseError(error)
    } catch (e) {
      const trpcError = e as TRPCError
      expect(trpcError.code).toBe('CONFLICT')
      expect(trpcError.message).toBe('A record with this value already exists')
    }
  })

  it('throws TRPCError with BAD_REQUEST for foreign key violation', () => {
    const error = createPostgrestError('23503')

    try {
      handleSupabaseError(error)
    } catch (e) {
      const trpcError = e as TRPCError
      expect(trpcError.code).toBe('BAD_REQUEST')
    }
  })

  it('throws TRPCError with FORBIDDEN for RLS violation', () => {
    const error = createPostgrestError('PGRST301')

    try {
      handleSupabaseError(error)
    } catch (e) {
      const trpcError = e as TRPCError
      expect(trpcError.code).toBe('FORBIDDEN')
      expect(trpcError.message).toBe('You do not have permission to perform this action')
    }
  })

  it('throws TRPCError with INTERNAL_SERVER_ERROR for unknown errors', () => {
    const error = createPostgrestError('UNKNOWN_CODE')

    try {
      handleSupabaseError(error)
    } catch (e) {
      const trpcError = e as TRPCError
      expect(trpcError.code).toBe('INTERNAL_SERVER_ERROR')
      expect(trpcError.message).toBe('An unexpected error occurred. Please try again.')
    }
  })

  it('includes original error as cause', () => {
    const error = createPostgrestError('23505', 'Original message')

    try {
      handleSupabaseError(error)
    } catch (e) {
      const trpcError = e as TRPCError
      // TRPCError wraps the cause, so check for the expected properties
      expect(trpcError.cause).toBeDefined()
      const cause = trpcError.cause as { code: string; message: string }
      expect(cause.code).toBe('23505')
      expect(cause.message).toBe('Original message')
    }
  })
})

describe('checkSupabaseError', () => {
  it('returns true when no error', () => {
    const result = checkSupabaseError(null)
    expect(result).toBe(true)
  })

  it('throws when error is present', () => {
    const error = createPostgrestError('23505')
    expect(() => checkSupabaseError(error)).toThrow(TRPCError)
  })

  it('returns false for PGRST116 when allowNotFound is true', () => {
    const error = createPostgrestError('PGRST116')
    const result = checkSupabaseError(error, 'Quote', true)
    expect(result).toBe(false)
  })

  it('throws for PGRST116 when allowNotFound is false', () => {
    const error = createPostgrestError('PGRST116')
    expect(() => checkSupabaseError(error, 'Quote', false)).toThrow(TRPCError)
  })

  it('throws for non-PGRST116 errors even when allowNotFound is true', () => {
    const error = createPostgrestError('23505')
    expect(() => checkSupabaseError(error, 'Quote', true)).toThrow(TRPCError)
  })
})

describe('assertDataExists', () => {
  it('does not throw when data exists', () => {
    expect(() => assertDataExists({ id: '1' })).not.toThrow()
    expect(() => assertDataExists('string')).not.toThrow()
    expect(() => assertDataExists(0)).not.toThrow()
    expect(() => assertDataExists(false)).not.toThrow()
    expect(() => assertDataExists([])).not.toThrow()
  })

  it('throws TRPCError with NOT_FOUND for null', () => {
    expect(() => assertDataExists(null, 'User')).toThrow(TRPCError)

    try {
      assertDataExists(null, 'User')
    } catch (e) {
      const trpcError = e as TRPCError
      expect(trpcError.code).toBe('NOT_FOUND')
      expect(trpcError.message).toBe('User not found')
    }
  })

  it('throws TRPCError with NOT_FOUND for undefined', () => {
    expect(() => assertDataExists(undefined)).toThrow(TRPCError)

    try {
      assertDataExists(undefined)
    } catch (e) {
      const trpcError = e as TRPCError
      expect(trpcError.code).toBe('NOT_FOUND')
      expect(trpcError.message).toBe('Record not found')
    }
  })
})

describe('sanitizeErrorMessage', () => {
  it('sanitizes column name errors', () => {
    const message = 'column "user_password" does not exist'
    expect(sanitizeErrorMessage(message)).toBe('Invalid field')
  })

  it('sanitizes table name errors', () => {
    const message = 'relation "users" does not exist'
    expect(sanitizeErrorMessage(message)).toBe('Invalid resource')
  })

  it('sanitizes unique constraint errors', () => {
    const message = 'duplicate key value violates unique constraint "users_email_key"'
    expect(sanitizeErrorMessage(message)).toBe('Record already exists')
  })

  it('sanitizes foreign key errors', () => {
    const message = 'violates foreign key constraint "quotes_user_id_fkey"'
    expect(sanitizeErrorMessage(message)).toBe('Invalid reference')
  })

  it('sanitizes not null errors', () => {
    const message = 'null value in column "email"'
    expect(sanitizeErrorMessage(message)).toBe('Required field is missing')
  })

  it('leaves non-sensitive messages unchanged', () => {
    const message = 'Network error'
    expect(sanitizeErrorMessage(message)).toBe('Network error')
  })
})
