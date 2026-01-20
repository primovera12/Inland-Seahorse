import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the service role key for admin operations.
 * This client bypasses RLS and can perform admin actions like creating users.
 * ONLY use this for server-side admin operations - never expose to client.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
