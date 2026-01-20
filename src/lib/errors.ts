import { TRPCError } from '@trpc/server'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Map PostgreSQL/Supabase error codes to TRPCError codes
 */
function mapErrorCode(error: PostgrestError): TRPCError['code'] {
  const code = error.code

  // PostgreSQL REST API codes
  switch (code) {
    case 'PGRST116': // No rows returned (for .single())
      return 'NOT_FOUND'
    case 'PGRST301': // Row-level security violation
    case 'PGRST302': // RLS policy violation
      return 'FORBIDDEN'
    case '23505': // Unique violation
      return 'CONFLICT'
    case '23503': // Foreign key violation
      return 'BAD_REQUEST'
    case '23502': // Not null violation
      return 'BAD_REQUEST'
    case '22P02': // Invalid text representation
    case '22003': // Numeric value out of range
      return 'BAD_REQUEST'
    case '42501': // Insufficient privilege
      return 'FORBIDDEN'
    case '42P01': // Undefined table
    case '42703': // Undefined column
      return 'INTERNAL_SERVER_ERROR'
    default:
      return 'INTERNAL_SERVER_ERROR'
  }
}

/**
 * Get a user-friendly error message without exposing internal details
 */
function getSafeErrorMessage(error: PostgrestError, context?: string): string {
  const code = error.code

  switch (code) {
    case 'PGRST116':
      return context ? `${context} not found` : 'Record not found'
    case '23505':
      return 'A record with this value already exists'
    case '23503':
      return 'This operation references a record that does not exist'
    case '23502':
      return 'Required field is missing'
    case '42501':
    case 'PGRST301':
    case 'PGRST302':
      return 'You do not have permission to perform this action'
    default:
      // Don't expose internal error details
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Handle a Supabase/PostgreSQL error and convert to TRPCError
 *
 * @param error - The PostgrestError from Supabase
 * @param context - Optional context for better error messages (e.g., "Quote", "Company")
 * @throws TRPCError with appropriate code and message
 *
 * @example
 * const { data, error } = await ctx.supabase.from('quotes').select()
 * if (error) handleSupabaseError(error, 'Quote')
 */
export function handleSupabaseError(
  error: PostgrestError,
  context?: string
): never {
  throw new TRPCError({
    code: mapErrorCode(error),
    message: getSafeErrorMessage(error, context),
    cause: error, // Preserve original error for logging
  })
}

/**
 * Check for Supabase error and throw if present, with special handling for PGRST116
 *
 * @param error - The PostgrestError from Supabase
 * @param context - Optional context for better error messages
 * @param allowNotFound - If true, PGRST116 (no rows) is not an error (returns false)
 * @returns true if there was no error, false if PGRST116 and allowNotFound is true
 * @throws TRPCError if there's an error (except PGRST116 when allowNotFound is true)
 */
export function checkSupabaseError(
  error: PostgrestError | null,
  context?: string,
  allowNotFound = false
): boolean {
  if (!error) return true

  // Handle PGRST116 specially when allowNotFound is true
  if (error.code === 'PGRST116' && allowNotFound) {
    return false
  }

  // Log full error details in development for debugging
  console.error(`[Supabase Error] ${context || 'Unknown context'}:`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  })

  handleSupabaseError(error, context)
}

/**
 * Assert that data was returned from a Supabase query
 *
 * @param data - The data from Supabase query
 * @param context - Context for error message (e.g., "Quote", "User")
 * @throws TRPCError with NOT_FOUND if data is null/undefined
 */
export function assertDataExists<T>(
  data: T | null | undefined,
  context?: string
): asserts data is T {
  if (data === null || data === undefined) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: context ? `${context} not found` : 'Record not found',
    })
  }
}

/**
 * Wrap an async operation with error handling
 * Catches any error and converts to TRPCError
 *
 * @param operation - The async operation to perform
 * @param context - Context for error messages
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // If it's already a TRPCError, rethrow
    if (error instanceof TRPCError) {
      throw error
    }

    // If it's a PostgrestError, handle it
    if (isPostgrestError(error)) {
      handleSupabaseError(error, context)
    }

    // For other errors, wrap in INTERNAL_SERVER_ERROR
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      cause: error,
    })
  }
}

/**
 * Type guard to check if an error is a PostgrestError
 */
function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  )
}

/**
 * Sanitize an error message for client display
 * Removes any potentially sensitive information
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove table/column names that might be in error messages
  const sanitized = message
    .replace(/column "[\w_]+" does not exist/gi, 'Invalid field')
    .replace(/relation "[\w_]+" does not exist/gi, 'Invalid resource')
    .replace(/duplicate key value violates unique constraint "[\w_]+"/gi, 'Record already exists')
    .replace(/violates foreign key constraint "[\w_]+"/gi, 'Invalid reference')
    .replace(/null value in column "[\w_]+"/gi, 'Required field is missing')

  return sanitized
}
