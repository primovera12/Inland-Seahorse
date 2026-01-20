import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user details from users table
    const { data: userData } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single()

    // Update last_login_at timestamp
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    // Log the login event
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        activity_type: 'login',
        subject: 'User logged in',
        description: userData
          ? `${userData.first_name || ''} ${userData.last_name || ''} logged in`.trim()
          : 'User logged in',
        metadata: {
          email: userData?.email || user.email,
        },
      })

    if (logError) {
      console.error('Failed to log login event:', logError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Record login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
