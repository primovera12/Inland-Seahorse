import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Admin-only endpoint for running database migrations
// Requires authenticated user with admin or super_admin role
export async function POST(request: NextRequest) {
  try {
    // First, verify the user is authenticated and is an admin
    const authClient = await createServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await authClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized - User profile not found' },
        { status: 401 }
      )
    }

    // Only allow admin and super_admin roles
    const allowedRoles = ['admin', 'super_admin']
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get service role key from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      )
    }

    // Create admin client with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Run the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE company_settings
          ADD COLUMN IF NOT EXISTS terms_dismantle TEXT,
          ADD COLUMN IF NOT EXISTS terms_inland TEXT,
          ADD COLUMN IF NOT EXISTS terms_version INTEGER NOT NULL DEFAULT 1;
      `,
    })

    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json(
        { error: 'Migration failed', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unexpected error', details: error },
      { status: 500 }
    )
  }
}
