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

    // Log the logout event
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        activity_type: 'logout',
        subject: 'User logged out',
        description: userData
          ? `${userData.first_name || ''} ${userData.last_name || ''} logged out`.trim()
          : 'User logged out',
        metadata: {
          email: userData?.email || user.email,
        },
      })

    if (logError) {
      console.error('Failed to log logout event:', logError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Record logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
