import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, error_message } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Use admin client to log without authentication
    const adminClient = createAdminClient()

    // Try to find the user by email to get their ID
    const { data: userData } = await adminClient
      .from('users')
      .select('id, first_name, last_name')
      .eq('email', email)
      .single()

    // Log the failed login event
    const { error: logError } = await adminClient
      .from('activity_logs')
      .insert({
        user_id: userData?.id || null,
        activity_type: 'failed_login',
        subject: 'Failed login attempt',
        description: userData
          ? `Failed login attempt for ${userData.first_name || ''} ${userData.last_name || ''} (${email})`.trim()
          : `Failed login attempt for ${email}`,
        metadata: {
          email,
          error_message: error_message || 'Invalid credentials',
          timestamp: new Date().toISOString(),
        },
      })

    if (logError) {
      console.error('Failed to log failed login event:', logError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Record failed login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
