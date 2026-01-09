import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
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
